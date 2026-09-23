import {
  BadRequestException,
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
 *  - The WalletTransaction ledger is append-only and is the source of truth;
 *    BrandWallet.balancePaise is a cached mirror that always equals the sum of
 *    the ledger.
 *  - The balance may never go negative. Every debit uses an atomic conditional
 *    UPDATE (decrement only when balance >= amount) so concurrent debits cannot
 *    race the balance below zero; a DB CHECK constraint backs this up.
 *  - Every public mutation runs in a transaction and can be composed into a
 *    caller's transaction by passing `tx` (e.g. crediting a brand atomically
 *    with flipping their cancelled order to CANCELLED_CREDITED).
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
  balancePaise: number;
  currency: string;
  /** Sum of REQUESTED withdrawals (already debited from balancePaise). */
  pendingWithdrawalPaise: number;
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  private assertPositive(amountPaise: number): number {
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      throw new BadRequestException('Amount must be a positive whole number of paise');
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
      // A concurrent request created it first — reload.
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
   * Apply one signed movement to a wallet and append the ledger row, atomically.
   * Positive credits, negative debits. Debits use a conditional decrement so the
   * balance can never go below zero (throws BadRequestException otherwise).
   */
  private async applyMovement(
    tx: Prisma.TransactionClient,
    walletId: string,
    signedAmountPaise: number,
    type: WalletTransactionType,
    meta: WalletMovementMeta,
  ): Promise<{ balanceAfterPaise: number }> {
    let balanceAfterPaise: number;
    if (signedAmountPaise < 0) {
      const need = -signedAmountPaise;
      const res = await tx.brandWallet.updateMany({
        where: { id: walletId, balancePaise: { gte: need } },
        data: { balancePaise: { decrement: need } },
      });
      if (res.count !== 1) {
        throw new BadRequestException('Insufficient credit balance');
      }
      const wallet = await tx.brandWallet.findUniqueOrThrow({
        where: { id: walletId },
        select: { balancePaise: true },
      });
      balanceAfterPaise = wallet.balancePaise;
    } else {
      const wallet = await tx.brandWallet.update({
        where: { id: walletId },
        data: { balancePaise: { increment: signedAmountPaise } },
        select: { balancePaise: true },
      });
      balanceAfterPaise = wallet.balancePaise;
    }

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

    return { balanceAfterPaise };
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
    const run = async (t: Prisma.TransactionClient) => {
      const wallet = await this.ensureWallet(params.brandId, t);
      return this.applyMovement(t, wallet.id, amount, params.type, params);
    };
    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Remove credit from a brand's wallet. Throws BadRequestException if the
   * balance would go negative. Composable via `tx`.
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
    const run = async (t: Prisma.TransactionClient) => {
      const wallet = await this.ensureWallet(params.brandId, t);
      return this.applyMovement(t, wallet.id, -amount, params.type, params);
    };
    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  // ── Order integration helpers ──────────────────────────────────────────────

  /** Credit a cancelled paid order's full net back to the brand. */
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

  /**
   * Reserve store credit to pay part/all of an order at checkout (debit). Throws
   * if the brand no longer has enough credit.
   */
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

  /** Return a reserved checkout debit (order abandoned/rejected before payment). */
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
      select: { balancePaise: true, currency: true },
    });
    const pending = await this.prisma.walletWithdrawal.aggregate({
      where: { brandId, status: WalletWithdrawalStatus.REQUESTED },
      _sum: { amountPaise: true },
    });
    return {
      balancePaise: wallet?.balancePaise ?? 0,
      currency: wallet?.currency ?? 'INR',
      pendingWithdrawalPaise: pending._sum.amountPaise ?? 0,
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

  // ── Withdrawals (brand-initiated) ────────────────────────────────────────────

  /**
   * Brand requests to withdraw store credit to real money. The amount is debited
   * from the spendable balance immediately (so it cannot also be spent at
   * checkout) and a REQUESTED withdrawal is created for an admin to pay out.
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
          brandNote: params.brandNote?.trim() || null,
          requestedByUserId: params.requestedByUserId,
        },
      });
      // Debits atomically; rolls back the withdrawal row if credit is short.
      await this.applyMovement(
        tx,
        wallet.id,
        -amount,
        WalletTransactionType.WITHDRAWAL_DEBIT,
        { withdrawalId: withdrawal.id, createdByUserId: params.requestedByUserId },
      );
      return withdrawal;
    });
  }

  /** Brand cancels their own still-pending withdrawal → money returns to credits. */
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
      await this.applyMovement(
        tx,
        withdrawal.walletId,
        withdrawal.amountPaise,
        WalletTransactionType.WITHDRAWAL_REVERSAL_CREDIT,
        { withdrawalId: withdrawal.id, reason: 'Cancelled by brand' },
      );
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
    const withdrawals = await this.prisma.walletWithdrawal.findMany({
      where: params.status ? { status: params.status } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(1, params.take ?? 50), 200),
      skip: params.skip ?? 0,
      include: {
        wallet: {
          select: {
            balancePaise: true,
            brand: { select: { id: true, brandName: true } },
          },
        },
      },
    });
    return withdrawals;
  }

  /** Admin marks a requested withdrawal as paid off-platform. No money moves. */
  async completeWithdrawal(params: {
    withdrawalId: string;
    processedByUserId: string;
    adminNote?: string | null;
  }) {
    const withdrawal = await this.prisma.walletWithdrawal.findUnique({
      where: { id: params.withdrawalId },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== WalletWithdrawalStatus.REQUESTED) {
      throw new BadRequestException(
        'Only a pending withdrawal can be completed',
      );
    }
    return this.prisma.walletWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: WalletWithdrawalStatus.COMPLETED,
        processedByUserId: params.processedByUserId,
        processedAt: new Date(),
        adminNote: params.adminNote?.trim() || null,
      },
    });
  }

  /** Admin rejects a requested withdrawal → the money returns to the brand. */
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
      await this.applyMovement(
        tx,
        withdrawal.walletId,
        withdrawal.amountPaise,
        WalletTransactionType.WITHDRAWAL_REVERSAL_CREDIT,
        { withdrawalId: withdrawal.id, reason: 'Rejected by admin' },
      );
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

  /**
   * Admin manual correction. Positive amount adds credit, negative removes it
   * (the support "pay them out off-platform then zero their credit" path).
   */
  async adminAdjust(params: {
    brandId: string;
    amountPaise: number;
    reason: string;
    adminUserId: string;
  }): Promise<{ balanceAfterPaise: number }> {
    if (!Number.isInteger(params.amountPaise) || params.amountPaise === 0) {
      throw new BadRequestException('Adjustment amount must be a non-zero whole number of paise');
    }
    if (!params.reason?.trim()) {
      throw new BadRequestException('A reason is required for a manual adjustment');
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
