import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  WalletTransactionType,
  WalletWithdrawalStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  creditOwnerWhere,
  normalizeCreditOwner,
  type CreditOwner,
} from './credit-owner.util';

/** One row of the admin Credits view: a brand or agency and the credit it holds. */
export type AdminBrandCreditRow = {
  ownerType: 'brand' | 'agency';
  /** Brand profile id when ownerType=brand; null for agencies. */
  brandId: string | null;
  /** Agency id when ownerType=agency; null for brands. */
  agencyId: string | null;
  brandName: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  /** Total credit owned (spendable + held), in paise. */
  balancePaise: number;
  /** Locked by pending withdrawal requests, in paise. */
  heldPaise: number;
  currency: string;
  /** Last wallet movement; null for an owner that has never held credit. */
  lastActivityAt: Date | null;
};

/**
 * Store-credit wallet ("Credits" in the UI). All amounts are integer paise, INR,
 * matching Order.expectedAmountPaise.
 *
 * Invariants (money-critical):
 *  - The WalletTransaction ledger is append-only and is the source of truth for
 *    the TOTAL balance; BrandWallet.balancePaise always equals the sum of the
 *    ledger. `heldPaise` is money inside balancePaise that is locked by pending
 *    withdrawal requests. Spendable = balancePaise - heldPaise, and neither the
 *    balance nor the held amount may go negative (DB CHECK constraints back this
 *    up).
 *  - Withdrawals use a HOLD model: requesting a refund LOCKS the amount (held++,
 *    no ledger movement); rejecting/cancelling RELEASES the hold (held--, no
 *    ledger movement); only COMPLETING it deducts the money (balance-- and
 *    held--, one WITHDRAWAL_DEBIT ledger row). So a rejected withdrawal leaves
 *    no ledger churn and never inflates "credited" totals.
 *  - Balance/held changes use an optimistic compare-and-set (retry on a
 *    concurrent change) so two operations cannot race the numbers out of range.
 *
 * Note: internally the model is called "wallet"; it is always surfaced to users
 * as "Credits". Do not rename the columns/models to match the UI wording.
 */

const CREDIT_TYPES: ReadonlySet<WalletTransactionType> = new Set([
  WalletTransactionType.ORDER_CANCELLATION_CREDIT,
  WalletTransactionType.CHECKOUT_REVERSAL_CREDIT,
  WalletTransactionType.WITHDRAWAL_REVERSAL_CREDIT,
  WalletTransactionType.ADMIN_ADJUSTMENT_CREDIT,
]);

const DEBIT_TYPES: ReadonlySet<WalletTransactionType> = new Set([
  WalletTransactionType.ORDER_CHECKOUT_DEBIT,
  WalletTransactionType.WITHDRAWAL_DEBIT,
  WalletTransactionType.ADMIN_ADJUSTMENT_DEBIT,
]);

export type WalletMovementMeta = {
  reason?: string | null;
  orderId?: string | null;
  withdrawalId?: string | null;
  createdByUserId?: string | null;
};

export type WalletBalance = {
  /** Total credit owned (spendable + held). */
  balancePaise: number;
  /** Portion locked by pending withdrawal requests. */
  heldPaise: number;
  /** Spendable now (balancePaise - heldPaise). */
  availablePaise: number;
  currency: string;
  /** Alias of heldPaise, kept for existing callers. */
  pendingWithdrawalPaise: number;
};

type WalletAmounts = { balancePaise: number; heldPaise: number };

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  private assertPositive(amountPaise: number): number {
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      throw new BadRequestException(
        'Amount must be a positive whole number of paise',
      );
    }
    return amountPaise;
  }

  /** Get or lazily create the buyer's wallet, returning its id. */
  private async ensureWallet(
    owner: CreditOwner,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string }> {
    const normalized = normalizeCreditOwner(owner);
    const where = creditOwnerWhere(normalized);
    const existing = await tx.brandWallet.findFirst({
      where,
      select: { id: true },
    });
    if (existing) return existing;
    try {
      return await tx.brandWallet.create({
        data: {
          brandId: normalized.brandId,
          agencyId: normalized.agencyId,
        },
        select: { id: true },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return tx.brandWallet.findFirstOrThrow({
          where,
          select: { id: true },
        });
      }
      throw err;
    }
  }

  /**
   * Apply a balance/held change with optimistic concurrency: read the current
   * amounts, let `compute` derive the next amounts (throwing if an invariant
   * would break), then update only if the row still holds the values we read.
   * Retries a few times if a concurrent change slips in between.
   */
  private async applyWalletMutation(
    walletId: string,
    compute: (cur: WalletAmounts) => WalletAmounts,
    tx: Prisma.TransactionClient,
  ): Promise<WalletAmounts> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const cur = await tx.brandWallet.findUniqueOrThrow({
        where: { id: walletId },
        select: { balancePaise: true, heldPaise: true },
      });
      const next = compute(cur);
      if (
        next.balancePaise < 0 ||
        next.heldPaise < 0 ||
        next.heldPaise > next.balancePaise
      ) {
        // compute() should throw a friendlier error before this, but never let
        // an out-of-range value through.
        throw new BadRequestException('Insufficient credit balance');
      }
      const res = await tx.brandWallet.updateMany({
        where: {
          id: walletId,
          balancePaise: cur.balancePaise,
          heldPaise: cur.heldPaise,
        },
        data: { balancePaise: next.balancePaise, heldPaise: next.heldPaise },
      });
      if (res.count === 1) return next;
    }
    throw new ConflictException(
      'Credits were being modified concurrently — please retry',
    );
  }

  private async writeLedger(
    tx: Prisma.TransactionClient,
    walletId: string,
    signedAmountPaise: number,
    type: WalletTransactionType,
    balanceAfterPaise: number,
    meta: WalletMovementMeta,
  ): Promise<void> {
    await tx.walletTransaction.create({
      data: {
        walletId,
        amountPaise: signedAmountPaise,
        type,
        balanceAfterPaise,
        reason: meta.reason ?? null,
        orderId: meta.orderId ?? null,
        withdrawalId: meta.withdrawalId ?? null,
        createdByUserId: meta.createdByUserId ?? null,
      },
    });
  }

  private run<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    tx?: Prisma.TransactionClient,
  ): Promise<T> {
    return tx ? fn(tx) : this.prisma.$transaction(fn);
  }

  /** Add credit to a buyer's wallet. Composable via `tx`. */
  async credit(
    params: {
      brandId?: string | null;
      agencyId?: string | null;
      amountPaise: number;
      type: WalletTransactionType;
    } & WalletMovementMeta,
    tx?: Prisma.TransactionClient,
  ): Promise<{ balanceAfterPaise: number }> {
    const amount = this.assertPositive(params.amountPaise);
    if (!CREDIT_TYPES.has(params.type)) {
      throw new BadRequestException(`${params.type} is not a credit type`);
    }
    return this.run(async (t) => {
      const wallet = await this.ensureWallet(params, t);
      const next = await this.applyWalletMutation(
        wallet.id,
        (cur) => ({
          balancePaise: cur.balancePaise + amount,
          heldPaise: cur.heldPaise,
        }),
        t,
      );
      await this.writeLedger(t, wallet.id, amount, params.type, next.balancePaise, params);
      return { balanceAfterPaise: next.balancePaise };
    }, tx);
  }

  /**
   * Remove credit from a buyer's wallet (respecting held funds — you can never
   * spend money reserved for a pending withdrawal). Throws BadRequestException
   * if the SPENDABLE balance is short. Composable via `tx`.
   */
  async debit(
    params: {
      brandId?: string | null;
      agencyId?: string | null;
      amountPaise: number;
      type: WalletTransactionType;
    } & WalletMovementMeta,
    tx?: Prisma.TransactionClient,
  ): Promise<{ balanceAfterPaise: number }> {
    const amount = this.assertPositive(params.amountPaise);
    if (!DEBIT_TYPES.has(params.type)) {
      throw new BadRequestException(`${params.type} is not a debit type`);
    }
    return this.run(async (t) => {
      const wallet = await this.ensureWallet(params, t);
      const next = await this.applyWalletMutation(
        wallet.id,
        (cur) => {
          if (cur.balancePaise - cur.heldPaise < amount) {
            throw new BadRequestException('Insufficient credit balance');
          }
          return {
            balancePaise: cur.balancePaise - amount,
            heldPaise: cur.heldPaise,
          };
        },
        t,
      );
      await this.writeLedger(t, wallet.id, -amount, params.type, next.balancePaise, params);
      return { balanceAfterPaise: next.balancePaise };
    }, tx);
  }

  // ── Order integration helpers ──────────────────────────────────────────────

  async creditOrderCancellation(
    params: {
      brandId?: string | null;
      agencyId?: string | null;
      orderId: string;
      amountPaise: number;
      reason?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ balanceAfterPaise: number }> {
    return this.credit(
      {
        brandId: params.brandId,
        agencyId: params.agencyId,
        amountPaise: params.amountPaise,
        type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
        orderId: params.orderId,
        reason: params.reason ?? null,
      },
      tx,
    );
  }

  async reserveForCheckout(
    params: {
      brandId?: string | null;
      agencyId?: string | null;
      orderId: string;
      amountPaise: number;
      createdByUserId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ balanceAfterPaise: number }> {
    return this.debit(
      {
        brandId: params.brandId,
        agencyId: params.agencyId,
        amountPaise: params.amountPaise,
        type: WalletTransactionType.ORDER_CHECKOUT_DEBIT,
        orderId: params.orderId,
        createdByUserId: params.createdByUserId ?? null,
      },
      tx,
    );
  }

  async releaseCheckoutReservation(
    params: {
      brandId?: string | null;
      agencyId?: string | null;
      orderId: string;
      amountPaise: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ balanceAfterPaise: number }> {
    return this.credit(
      {
        brandId: params.brandId,
        agencyId: params.agencyId,
        amountPaise: params.amountPaise,
        type: WalletTransactionType.CHECKOUT_REVERSAL_CREDIT,
        orderId: params.orderId,
      },
      tx,
    );
  }

  // ── Reads ───────────────────────────────────────────────────────────────────

  async getBalance(owner: CreditOwner | string): Promise<WalletBalance> {
    const normalized =
      typeof owner === 'string'
        ? normalizeCreditOwner({ brandId: owner })
        : normalizeCreditOwner(owner);
    const wallet = await this.prisma.brandWallet.findFirst({
      where: creditOwnerWhere(normalized),
      select: { balancePaise: true, heldPaise: true, currency: true },
    });
    const balancePaise = wallet?.balancePaise ?? 0;
    const heldPaise = wallet?.heldPaise ?? 0;
    return {
      balancePaise,
      heldPaise,
      availablePaise: balancePaise - heldPaise,
      currency: wallet?.currency ?? 'INR',
      pendingWithdrawalPaise: heldPaise,
    };
  }

  async getTransactions(owner: CreditOwner | string, limit = 50) {
    const normalized =
      typeof owner === 'string'
        ? normalizeCreditOwner({ brandId: owner })
        : normalizeCreditOwner(owner);
    const wallet = await this.prisma.brandWallet.findFirst({
      where: creditOwnerWhere(normalized),
      select: { id: true },
    });
    if (!wallet) return [];
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 200),
    });
  }

  async listWithdrawalsForBrand(owner: CreditOwner | string) {
    const normalized =
      typeof owner === 'string'
        ? normalizeCreditOwner({ brandId: owner })
        : normalizeCreditOwner(owner);
    return this.prisma.walletWithdrawal.findMany({
      where: creditOwnerWhere(normalized),
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Withdrawals (hold model) ─────────────────────────────────────────────────

  /**
   * Buyer requests to withdraw store credit. The amount is LOCKED (held) so it
   * cannot also be spent at checkout, but it is NOT removed from the balance —
   * that only happens when an admin completes the withdrawal.
   */
  async requestWithdrawal(params: {
    brandId?: string | null;
    agencyId?: string | null;
    requestedByUserId: string;
    amountPaise: number;
    brandNote?: string | null;
  }) {
    const amount = this.assertPositive(params.amountPaise);
    const owner = normalizeCreditOwner(params);
    return this.prisma.$transaction(async (tx) => {
      const wallet = await this.ensureWallet(owner, tx);
      const withdrawal = await tx.walletWithdrawal.create({
        data: {
          walletId: wallet.id,
          brandId: owner.brandId,
          agencyId: owner.agencyId,
          amountPaise: amount,
          status: WalletWithdrawalStatus.REQUESTED,
          holdModel: true,
          brandNote: params.brandNote?.trim() || null,
          requestedByUserId: params.requestedByUserId,
        },
      });
      // Lock the funds (rolls back the withdrawal row if spendable is short).
      await this.applyWalletMutation(
        wallet.id,
        (cur) => {
          if (cur.balancePaise - cur.heldPaise < amount) {
            throw new BadRequestException('Insufficient credit balance');
          }
          return {
            balancePaise: cur.balancePaise,
            heldPaise: cur.heldPaise + amount,
          };
        },
        tx,
      );
      return withdrawal;
    });
  }

  /** Release a pending withdrawal's lock (or, for a legacy row, credit it back). */
  private async unwindPendingWithdrawal(
    tx: Prisma.TransactionClient,
    withdrawal: {
      id: string;
      walletId: string;
      brandId: string | null;
      agencyId: string | null;
      amountPaise: number;
      holdModel: boolean;
    },
    reason: string,
  ): Promise<void> {
    if (withdrawal.holdModel) {
      // Just release the hold — the money never left the balance.
      await this.applyWalletMutation(
        withdrawal.walletId,
        (cur) => ({
          balancePaise: cur.balancePaise,
          heldPaise: cur.heldPaise - withdrawal.amountPaise,
        }),
        tx,
      );
      return;
    }
    // Legacy debit-on-request row: credit the money back to the balance.
    const next = await this.applyWalletMutation(
      withdrawal.walletId,
      (cur) => ({
        balancePaise: cur.balancePaise + withdrawal.amountPaise,
        heldPaise: cur.heldPaise,
      }),
      tx,
    );
    await this.writeLedger(
      tx,
      withdrawal.walletId,
      withdrawal.amountPaise,
      WalletTransactionType.WITHDRAWAL_REVERSAL_CREDIT,
      next.balancePaise,
      { withdrawalId: withdrawal.id, reason },
    );
  }

  async cancelWithdrawalByBrand(params: {
    withdrawalId: string;
    brandId?: string | null;
    agencyId?: string | null;
  }) {
    const owner = normalizeCreditOwner(params);
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.walletWithdrawal.findUnique({
        where: { id: params.withdrawalId },
      });
      if (!withdrawal) throw new NotFoundException('Withdrawal not found');
      const owns =
        (owner.brandId && withdrawal.brandId === owner.brandId) ||
        (owner.agencyId && withdrawal.agencyId === owner.agencyId);
      if (!owns) {
        throw new ForbiddenException('Not your withdrawal');
      }
      if (withdrawal.status !== WalletWithdrawalStatus.REQUESTED) {
        throw new BadRequestException(
          'Only a pending withdrawal can be cancelled',
        );
      }
      await this.unwindPendingWithdrawal(tx, withdrawal, 'Cancelled by buyer');
      return tx.walletWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: WalletWithdrawalStatus.CANCELLED,
          processedAt: new Date(),
        },
      });
    });
  }

  // ── Withdrawals & adjustments (admin) ────────────────────────────────────────

  async listWithdrawalsForAdmin(params: {
    status?: WalletWithdrawalStatus;
    take?: number;
    skip?: number;
  }) {
    return this.prisma.walletWithdrawal.findMany({
      where: params.status ? { status: params.status } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(1, params.take ?? 50), 200),
      skip: params.skip ?? 0,
      include: {
        wallet: {
          select: {
            balancePaise: true,
            heldPaise: true,
            brand: { select: { id: true, brandName: true } },
            agency: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * Admin marks a requested withdrawal as paid off-platform. For a hold-model
   * withdrawal this is where the money actually leaves the balance (held is
   * released and the balance is debited, one WITHDRAWAL_DEBIT ledger row). A
   * legacy row already debited on request, so this only flips the status.
   */
  async completeWithdrawal(params: {
    withdrawalId: string;
    processedByUserId: string;
    adminNote?: string | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.walletWithdrawal.findUnique({
        where: { id: params.withdrawalId },
      });
      if (!withdrawal) throw new NotFoundException('Withdrawal not found');
      if (withdrawal.status !== WalletWithdrawalStatus.REQUESTED) {
        throw new BadRequestException(
          'Only a pending withdrawal can be completed',
        );
      }
      if (withdrawal.holdModel) {
        const next = await this.applyWalletMutation(
          withdrawal.walletId,
          (cur) => ({
            balancePaise: cur.balancePaise - withdrawal.amountPaise,
            heldPaise: cur.heldPaise - withdrawal.amountPaise,
          }),
          tx,
        );
        await this.writeLedger(
          tx,
          withdrawal.walletId,
          -withdrawal.amountPaise,
          WalletTransactionType.WITHDRAWAL_DEBIT,
          next.balancePaise,
          { withdrawalId: withdrawal.id, createdByUserId: params.processedByUserId },
        );
      }
      return tx.walletWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: WalletWithdrawalStatus.COMPLETED,
          processedByUserId: params.processedByUserId,
          processedAt: new Date(),
          adminNote: params.adminNote?.trim() || null,
        },
      });
    });
  }

  /** Admin rejects a requested withdrawal → the money is released back. */
  async rejectWithdrawal(params: {
    withdrawalId: string;
    processedByUserId: string;
    adminNote?: string | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.walletWithdrawal.findUnique({
        where: { id: params.withdrawalId },
      });
      if (!withdrawal) throw new NotFoundException('Withdrawal not found');
      if (withdrawal.status !== WalletWithdrawalStatus.REQUESTED) {
        throw new BadRequestException(
          'Only a pending withdrawal can be rejected',
        );
      }
      await this.unwindPendingWithdrawal(tx, withdrawal, 'Rejected by admin');
      return tx.walletWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: WalletWithdrawalStatus.REJECTED,
          processedByUserId: params.processedByUserId,
          processedAt: new Date(),
          adminNote: params.adminNote?.trim() || null,
        },
      });
    });
  }

  async adminAdjust(params: {
    brandId?: string | null;
    agencyId?: string | null;
    amountPaise: number;
    reason: string;
    adminUserId: string;
  }): Promise<{ balanceAfterPaise: number }> {
    if (!Number.isInteger(params.amountPaise) || params.amountPaise === 0) {
      throw new BadRequestException(
        'Adjustment amount must be a non-zero whole number of paise',
      );
    }
    if (!params.reason?.trim()) {
      throw new BadRequestException(
        'A reason is required for a manual adjustment',
      );
    }
    const owner = {
      brandId: params.brandId,
      agencyId: params.agencyId,
    };
    if (params.amountPaise > 0) {
      return this.credit({
        ...owner,
        amountPaise: params.amountPaise,
        type: WalletTransactionType.ADMIN_ADJUSTMENT_CREDIT,
        reason: params.reason.trim(),
        createdByUserId: params.adminUserId,
      });
    }
    return this.debit({
      ...owner,
      amountPaise: -params.amountPaise,
      type: WalletTransactionType.ADMIN_ADJUSTMENT_DEBIT,
      reason: params.reason.trim(),
      createdByUserId: params.adminUserId,
    });
  }

  /**
   * Every brand and agency with its credit position, for the admin Credits view.
   *
   * A LEFT JOIN, not a scan of BrandWallet: the wallet row is created lazily on
   * a buyer's first credit or debit (see ensureWallet), so listing the wallet
   * table alone would silently omit every owner that has never had credit.
   * Owners without a wallet read as a genuine ₹0 rather than going missing.
   *
   * Raw SQL for the ordering. Postgres sorts NULLs FIRST on a DESC ordering, so
   * an ORM orderBy over the nullable wallet relation would float the ₹0 owners
   * to the top of a list whose whole purpose is showing who holds credit;
   * COALESCE ranks them as the zeros they are.
   */
  async listBrandCreditsForAdmin(params: {
    take?: number;
    skip?: number;
    /** Include owners holding ₹0. Off by default — usually the shorter list. */
    includeZero?: boolean;
    /** Case-insensitive name filter (brand name or agency name). */
    search?: string;
  }): Promise<{
    rows: AdminBrandCreditRow[];
    total: number;
    totalBalancePaise: number;
    totalHeldPaise: number;
  }> {
    const take = Math.min(Math.max(1, params.take ?? 25), 200);
    const skip = Math.max(0, params.skip ?? 0);
    const includeZero = params.includeZero === true;
    const search = params.search?.trim();

    const brandZeroFilter = includeZero
      ? Prisma.empty
      : Prisma.sql`AND COALESCE(w."balancePaise", 0) > 0`;
    const agencyZeroFilter = includeZero
      ? Prisma.empty
      : Prisma.sql`AND COALESCE(w."balancePaise", 0) > 0`;
    const brandSearchFilter = search
      ? Prisma.sql`AND b."brandName" ILIKE ${`%${search}%`}`
      : Prisma.empty;
    const agencySearchFilter = search
      ? Prisma.sql`AND a.name ILIKE ${`%${search}%`}`
      : Prisma.empty;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<AdminBrandCreditRow[]>`
        SELECT * FROM (
          SELECT 'brand'::text AS "ownerType",
                 b.id AS "brandId",
                 NULL::uuid AS "agencyId",
                 b."brandName",
                 b."logoUrl",
                 b."contactEmail",
                 COALESCE(w."balancePaise", 0)::int AS "balancePaise",
                 COALESCE(w."heldPaise", 0)::int AS "heldPaise",
                 COALESCE(w.currency, 'INR') AS "currency",
                 w."updatedAt" AS "lastActivityAt"
          FROM "BrandProfile" b
          LEFT JOIN "BrandWallet" w ON w."brandId" = b.id
          WHERE TRUE ${brandZeroFilter} ${brandSearchFilter}
          UNION ALL
          SELECT 'agency'::text AS "ownerType",
                 NULL::uuid AS "brandId",
                 a.id AS "agencyId",
                 a.name AS "brandName",
                 a."logoUrl",
                 a."contactEmail",
                 COALESCE(w."balancePaise", 0)::int AS "balancePaise",
                 COALESCE(w."heldPaise", 0)::int AS "heldPaise",
                 COALESCE(w.currency, 'INR') AS "currency",
                 w."updatedAt" AS "lastActivityAt"
          FROM "Agency" a
          LEFT JOIN "BrandWallet" w ON w."agencyId" = a.id
          WHERE TRUE ${agencyZeroFilter} ${agencySearchFilter}
        ) q
        ORDER BY COALESCE(q."balancePaise", 0) DESC,
                 q."brandName" ASC NULLS LAST,
                 COALESCE(q."brandId", q."agencyId") ASC
        LIMIT ${take} OFFSET ${skip}
      `,
      this.prisma.$queryRaw<{ count: bigint; balance: bigint; held: bigint }[]>`
        SELECT COUNT(*)::bigint AS count,
               COALESCE(SUM(q."balancePaise"), 0)::bigint AS balance,
               COALESCE(SUM(q."heldPaise"), 0)::bigint AS held
        FROM (
          SELECT COALESCE(w."balancePaise", 0)::int AS "balancePaise",
                 COALESCE(w."heldPaise", 0)::int AS "heldPaise"
          FROM "BrandProfile" b
          LEFT JOIN "BrandWallet" w ON w."brandId" = b.id
          WHERE TRUE ${brandZeroFilter} ${brandSearchFilter}
          UNION ALL
          SELECT COALESCE(w."balancePaise", 0)::int AS "balancePaise",
                 COALESCE(w."heldPaise", 0)::int AS "heldPaise"
          FROM "Agency" a
          LEFT JOIN "BrandWallet" w ON w."agencyId" = a.id
          WHERE TRUE ${agencyZeroFilter} ${agencySearchFilter}
        ) q
      `,
    ]);

    const totals = countRows[0];
    return {
      rows,
      total: Number(totals?.count ?? 0),
      totalBalancePaise: Number(totals?.balance ?? 0),
      totalHeldPaise: Number(totals?.held ?? 0),
    };
  }
}
