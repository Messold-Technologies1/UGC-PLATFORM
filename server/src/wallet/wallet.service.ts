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

  /** Get or lazily create the brand's wallet, returning its id. */
  private async ensureWallet(
    brandId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string }> {
    const existing = await tx.brandWallet.findUnique({
      where: { brandId },
      select: { id: true },
    });
    if (existing) return existing;
    try {
      return await tx.brandWallet.create({
        data: { brandId },
        select: { id: true },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return tx.brandWallet.findUniqueOrThrow({
          where: { brandId },
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

  /** Add credit to a brand's wallet. Composable via `tx`. */
  async credit(
    params: {
      brandId: string;
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
      const wallet = await this.ensureWallet(params.brandId, t);
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
   * Remove credit from a brand's wallet (respecting held funds — you can never
   * spend money reserved for a pending withdrawal). Throws BadRequestException
   * if the SPENDABLE balance is short. Composable via `tx`.
   */
  async debit(
    params: {
      brandId: string;
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
      const wallet = await this.ensureWallet(params.brandId, t);
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
      brandId: string;
      orderId: string;
      amountPaise: number;
      reason?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ balanceAfterPaise: number }> {
    return this.credit(
      {
        brandId: params.brandId,
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
      brandId: string;
      orderId: string;
      amountPaise: number;
      createdByUserId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ balanceAfterPaise: number }> {
    return this.debit(
      {
        brandId: params.brandId,
        amountPaise: params.amountPaise,
        type: WalletTransactionType.ORDER_CHECKOUT_DEBIT,
        orderId: params.orderId,
        createdByUserId: params.createdByUserId ?? null,
      },
      tx,
    );
  }

  async releaseCheckoutReservation(
    params: { brandId: string; orderId: string; amountPaise: number },
    tx?: Prisma.TransactionClient,
  ): Promise<{ balanceAfterPaise: number }> {
    return this.credit(
      {
        brandId: params.brandId,
        amountPaise: params.amountPaise,
        type: WalletTransactionType.CHECKOUT_REVERSAL_CREDIT,
        orderId: params.orderId,
      },
      tx,
    );
  }

  // ── Reads ───────────────────────────────────────────────────────────────────

  async getBalance(brandId: string): Promise<WalletBalance> {
    const wallet = await this.prisma.brandWallet.findUnique({
      where: { brandId },
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

  async getTransactions(brandId: string, limit = 50) {
    const wallet = await this.prisma.brandWallet.findUnique({
      where: { brandId },
      select: { id: true },
    });
    if (!wallet) return [];
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 200),
    });
  }

  async listWithdrawalsForBrand(brandId: string) {
    return this.prisma.walletWithdrawal.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Withdrawals (hold model) ─────────────────────────────────────────────────

  /**
   * Brand requests to withdraw store credit. The amount is LOCKED (held) so it
   * cannot also be spent at checkout, but it is NOT removed from the balance —
   * that only happens when an admin completes the withdrawal.
   */
  async requestWithdrawal(params: {
    brandId: string;
    requestedByUserId: string;
    amountPaise: number;
    brandNote?: string | null;
  }) {
    const amount = this.assertPositive(params.amountPaise);
    return this.prisma.$transaction(async (tx) => {
      const wallet = await this.ensureWallet(params.brandId, tx);
      const withdrawal = await tx.walletWithdrawal.create({
        data: {
          walletId: wallet.id,
          brandId: params.brandId,
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
      brandId: string;
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
    brandId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.walletWithdrawal.findUnique({
        where: { id: params.withdrawalId },
      });
      if (!withdrawal) throw new NotFoundException('Withdrawal not found');
      if (withdrawal.brandId !== params.brandId) {
        throw new ForbiddenException('Not your withdrawal');
      }
      if (withdrawal.status !== WalletWithdrawalStatus.REQUESTED) {
        throw new BadRequestException(
          'Only a pending withdrawal can be cancelled',
        );
      }
      await this.unwindPendingWithdrawal(tx, withdrawal, 'Cancelled by brand');
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
    brandId: string;
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
    if (params.amountPaise > 0) {
      return this.credit({
        brandId: params.brandId,
        amountPaise: params.amountPaise,
        type: WalletTransactionType.ADMIN_ADJUSTMENT_CREDIT,
        reason: params.reason.trim(),
        createdByUserId: params.adminUserId,
      });
    }
    return this.debit({
      brandId: params.brandId,
      amountPaise: -params.amountPaise,
      type: WalletTransactionType.ADMIN_ADJUSTMENT_DEBIT,
      reason: params.reason.trim(),
      createdByUserId: params.adminUserId,
    });
  }
}
