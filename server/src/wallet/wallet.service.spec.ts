import { BadRequestException } from '@nestjs/common';
import { WalletTransactionType, WalletWithdrawalStatus } from '@prisma/client';

import { WalletService } from './wallet.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * In-memory fake of the Prisma surface WalletService uses. Models the two
 * money-critical behaviours:
 *  - balance/held/promo changes go through updateMany with an optimistic
 *    compare-and-set (where matches the read balancePaise + heldPaise +
 *    promoPaise); the fake applies the absolute next values only when they still
 *    match;
 *  - $transaction snapshots and restores state on throw, so a failed hold rolls
 *    back an already-created withdrawal row.
 */
class FakePrisma {
  wallets = new Map<string, any>();
  txns: any[] = [];
  withdrawals = new Map<string, any>();
  private seq = 0;
  private id(p: string) {
    return `${p}-${++this.seq}`;
  }

  brandWallet = {
    findUnique: async ({ where }: any) => {
      const w = where.brandId
        ? [...this.wallets.values()].find((x) => x.brandId === where.brandId)
        : where.agencyId
          ? [...this.wallets.values()].find(
              (x) => x.agencyId === where.agencyId,
            )
          : this.wallets.get(where.id);
      return w ? { ...w } : null;
    },
    findUniqueOrThrow: async (args: any) => {
      const w = await this.brandWallet.findUnique(args);
      if (!w) throw new Error('wallet not found');
      return w;
    },
    findFirst: async ({ where }: any) => {
      const w = [...this.wallets.values()].find((x) => {
        if (where?.brandId) return x.brandId === where.brandId;
        if (where?.agencyId) return x.agencyId === where.agencyId;
        return false;
      });
      return w ? { ...w } : null;
    },
    findFirstOrThrow: async (args: any) => {
      const w = await this.brandWallet.findFirst(args);
      if (!w) throw new Error('wallet not found');
      return w;
    },
    create: async ({ data }: any) => {
      const clash = [...this.wallets.values()].some(
        (x) =>
          (data.brandId && x.brandId === data.brandId) ||
          (data.agencyId && x.agencyId === data.agencyId),
      );
      if (clash) {
        const e: any = new Error('unique');
        e.code = 'P2002';
        Object.setPrototypeOf(
          e,
          require('@prisma/client').Prisma.PrismaClientKnownRequestError
            .prototype,
        );
        throw e;
      }
      const w = {
        id: this.id('wallet'),
        brandId: data.brandId ?? null,
        agencyId: data.agencyId ?? null,
        balancePaise: data.balancePaise ?? 0,
        heldPaise: data.heldPaise ?? 0,
        promoPaise: data.promoPaise ?? 0,
        currency: data.currency ?? 'INR',
      };
      this.wallets.set(w.id, w);
      return { ...w };
    },
    // Optimistic compare-and-set: absolute next values, applied only when the
    // read balancePaise/heldPaise still match.
    updateMany: async ({ where, data }: any) => {
      const w = this.wallets.get(where.id);
      if (!w) return { count: 0 };
      if (
        where.balancePaise !== undefined &&
        w.balancePaise !== where.balancePaise
      )
        return { count: 0 };
      if (where.heldPaise !== undefined && w.heldPaise !== where.heldPaise)
        return { count: 0 };
      if (where.promoPaise !== undefined && w.promoPaise !== where.promoPaise)
        return { count: 0 };
      if (data.balancePaise !== undefined) w.balancePaise = data.balancePaise;
      if (data.heldPaise !== undefined) w.heldPaise = data.heldPaise;
      if (data.promoPaise !== undefined) w.promoPaise = data.promoPaise;
      return { count: 1 };
    },
  };

  walletTransaction = {
    create: async ({ data }: any) => {
      const row = {
        id: this.id('txn'),
        createdAt: new Date(),
        promoPaise: 0,
        ...data,
      };
      this.txns.push(row);
      return { ...row };
    },
    findFirst: async ({ where }: any) => {
      const row = this.txns.find(
        (t) =>
          (where.orderId === undefined || t.orderId === where.orderId) &&
          (where.type === undefined || t.type === where.type),
      );
      return row ? { ...row } : null;
    },
    aggregate: async ({ where }: any) => {
      const rows = this.txns.filter(
        (t) =>
          (where.walletId === undefined || t.walletId === where.walletId) &&
          (where.orderId === undefined || t.orderId === where.orderId),
      );
      return {
        _sum: {
          promoPaise: rows.reduce((sum, t) => sum + (t.promoPaise ?? 0), 0),
        },
      };
    },
    findMany: async ({ where, take }: any) => {
      const rows = this.txns
        .filter((t) => t.walletId === where.walletId)
        .slice()
        .reverse();
      return take ? rows.slice(0, take) : rows;
    },
  };

  walletWithdrawal = {
    create: async ({ data }: any) => {
      const row = {
        id: this.id('wd'),
        status: WalletWithdrawalStatus.REQUESTED,
        holdModel: true,
        brandNote: null,
        adminNote: null,
        processedByUserId: null,
        processedAt: null,
        createdAt: new Date(),
        ...data,
      };
      this.withdrawals.set(row.id, row);
      return { ...row };
    },
    findUnique: async ({ where }: any) => {
      const w = this.withdrawals.get(where.id);
      return w ? { ...w } : null;
    },
    update: async ({ where, data }: any) => {
      const w = this.withdrawals.get(where.id);
      Object.assign(w, data);
      return { ...w };
    },
    findMany: async ({ where }: any) =>
      [...this.withdrawals.values()].filter(
        (w) => !where?.brandId || w.brandId === where.brandId,
      ),
  };

  async $transaction(fn: (tx: any) => Promise<any>) {
    const snap = {
      wallets: new Map([...this.wallets].map(([k, v]) => [k, { ...v }])),
      txns: [...this.txns],
      withdrawals: new Map(
        [...this.withdrawals].map(([k, v]) => [k, { ...v }]),
      ),
    };
    try {
      return await fn(this);
    } catch (e) {
      this.wallets = snap.wallets;
      this.txns = snap.txns;
      this.withdrawals = snap.withdrawals;
      throw e;
    }
  }
}

describe('WalletService', () => {
  let prisma: FakePrisma;
  let service: WalletService;
  const brandId = 'brand-1';

  beforeEach(() => {
    prisma = new FakePrisma();
    service = new WalletService(prisma as unknown as PrismaService);
  });

  const bal = () => service.getBalance(brandId);

  it('credits create the wallet lazily and increase the balance', async () => {
    const { balanceAfterPaise } = await service.credit({
      brandId,
      amountPaise: 500000,
      type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
    });
    expect(balanceAfterPaise).toBe(500000);
    const b = await bal();
    expect(b.balancePaise).toBe(500000);
    expect(b.availablePaise).toBe(500000);
    expect(prisma.txns).toHaveLength(1);
  });

  it('rejects a debit that would overdraw the spendable balance', async () => {
    await service.credit({
      brandId,
      amountPaise: 300000,
      type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
    });
    await expect(
      service.debit({
        brandId,
        amountPaise: 300001,
        type: WalletTransactionType.ORDER_CHECKOUT_DEBIT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect((await bal()).balancePaise).toBe(300000);
  });

  describe('withdrawals (hold model)', () => {
    beforeEach(async () => {
      await service.credit({
        brandId,
        amountPaise: 800000,
        type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
      });
    });

    it('locks funds on request without moving the balance or the ledger', async () => {
      const before = prisma.txns.length;
      const w = await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 500000,
      });
      expect(w.status).toBe(WalletWithdrawalStatus.REQUESTED);
      const b = await bal();
      expect(b.balancePaise).toBe(800000); // unchanged
      expect(b.heldPaise).toBe(500000); // locked
      expect(b.availablePaise).toBe(300000); // spendable
      expect(prisma.txns.length).toBe(before); // no ledger churn
    });

    it('held funds cannot be spent at checkout', async () => {
      await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 500000,
      });
      // 300000 spendable — 400000 must fail.
      await expect(
        service.reserveForCheckout({
          brandId,
          orderId: 'order-1',
          amountPaise: 400000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      // 300000 is fine.
      await service.reserveForCheckout({
        brandId,
        orderId: 'order-1',
        amountPaise: 300000,
      });
      const b = await bal();
      expect(b.balancePaise).toBe(500000);
      expect(b.availablePaise).toBe(0);
    });

    it('rejecting releases the hold with no ledger entry', async () => {
      const w = await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 500000,
      });
      const before = prisma.txns.length;
      await service.rejectWithdrawal({
        withdrawalId: w.id,
        processedByUserId: 'admin-1',
        adminNote: 'bad details',
      });
      const b = await bal();
      expect(b.balancePaise).toBe(800000);
      expect(b.heldPaise).toBe(0);
      expect(b.availablePaise).toBe(800000);
      expect(prisma.txns.length).toBe(before); // no reversal credit
    });

    it('cancelling by the brand releases the hold', async () => {
      const w = await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 500000,
      });
      await service.cancelWithdrawalByBrand({ withdrawalId: w.id, brandId });
      const b = await bal();
      expect(b.heldPaise).toBe(0);
      expect(b.availablePaise).toBe(800000);
    });

    it('completing debits the balance once (single WITHDRAWAL_DEBIT)', async () => {
      const w = await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 500000,
      });
      const before = prisma.txns.length;
      const done = await service.completeWithdrawal({
        withdrawalId: w.id,
        processedByUserId: 'admin-1',
      });
      expect(done.status).toBe(WalletWithdrawalStatus.COMPLETED);
      const b = await bal();
      expect(b.balancePaise).toBe(300000); // money actually left now
      expect(b.heldPaise).toBe(0);
      const added = prisma.txns.slice(before);
      expect(added).toHaveLength(1);
      expect(added[0].type).toBe(WalletTransactionType.WITHDRAWAL_DEBIT);
      expect(added[0].amountPaise).toBe(-500000);
    });

    it('rolls back the withdrawal row when spendable credit is short', async () => {
      await expect(
        service.requestWithdrawal({
          brandId,
          requestedByUserId: 'user-1',
          amountPaise: 900000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.withdrawals.size).toBe(0);
      expect((await bal()).balancePaise).toBe(800000);
    });

    it('a completed withdrawal cannot be completed again', async () => {
      const w = await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 500000,
      });
      await service.completeWithdrawal({
        withdrawalId: w.id,
        processedByUserId: 'admin-1',
      });
      await expect(
        service.completeWithdrawal({
          withdrawalId: w.id,
          processedByUserId: 'admin-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('reward credit (non-withdrawable promo bucket)', () => {
    const reward = (amountPaise = 5000, orderId = 'order-reward') =>
      service.creditOrderCompletion({ brandId, orderId, amountPaise });

    it('is spendable at checkout but not refundable', async () => {
      await reward();
      const b = await bal();
      expect(b.balancePaise).toBe(5000);
      expect(b.promoPaise).toBe(5000);
      expect(b.availablePaise).toBe(5000); // can be spent
      expect(b.refundablePaise).toBe(0); // can never be paid out
    });

    it('cannot be withdrawn even though the balance covers it', async () => {
      await reward();
      await service.credit({
        brandId,
        amountPaise: 20000,
        type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
      });
      // ₹250 owned, ₹50 of it a reward → only ₹200 may be withdrawn.
      await expect(
        service.requestWithdrawal({
          brandId,
          requestedByUserId: 'user-1',
          amountPaise: 20001,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      const w = await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 20000,
      });
      expect(w.amountPaise).toBe(20000);
      expect((await bal()).refundablePaise).toBe(0);
    });

    it('is spent before the brand own refundable credit', async () => {
      await reward();
      await service.credit({
        brandId,
        amountPaise: 20000,
        type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
      });
      await service.reserveForCheckout({
        brandId,
        orderId: 'order-1',
        amountPaise: 8000,
      });
      const b = await bal();
      expect(b.balancePaise).toBe(17000);
      expect(b.promoPaise).toBe(0); // reward drained first
      expect(b.refundablePaise).toBe(17000);
      const debit = prisma.txns.at(-1);
      expect(debit.type).toBe(WalletTransactionType.ORDER_CHECKOUT_DEBIT);
      expect(debit.promoPaise).toBe(-5000); // the promo part of the spend
    });

    it('comes back as reward credit when the checkout is reversed', async () => {
      // Otherwise the loop "spend the reward, abandon the order, withdraw the
      // proceeds" would turn a non-refundable reward into cash.
      await reward();
      await service.reserveForCheckout({
        brandId,
        orderId: 'order-1',
        amountPaise: 5000,
      });
      expect((await bal()).promoPaise).toBe(0);
      await service.releaseCheckoutReservation({
        brandId,
        orderId: 'order-1',
        amountPaise: 5000,
      });
      const b = await bal();
      expect(b.balancePaise).toBe(5000);
      expect(b.promoPaise).toBe(5000);
      expect(b.refundablePaise).toBe(0);
    });

    it('comes back as reward credit when the paid order is cancelled', async () => {
      await reward();
      await service.credit({
        brandId,
        amountPaise: 45000,
        type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
      });
      // ₹500 order funded by ₹50 reward + ₹450 refundable credit.
      await service.reserveForCheckout({
        brandId,
        orderId: 'order-1',
        amountPaise: 50000,
      });
      expect((await bal()).balancePaise).toBe(0);

      await service.creditOrderCancellation({
        brandId,
        orderId: 'order-1',
        amountPaise: 50000,
        reason: 'cancelled before the creator accepted',
      });
      const b = await bal();
      expect(b.balancePaise).toBe(50000);
      expect(b.promoPaise).toBe(5000); // only the reward part stays locked in
      expect(b.refundablePaise).toBe(45000);
    });

    it('returns no more promo than the order actually spent', async () => {
      await reward();
      await service.reserveForCheckout({
        brandId,
        orderId: 'order-1',
        amountPaise: 5000,
      });
      await service.releaseCheckoutReservation({
        brandId,
        orderId: 'order-1',
        amountPaise: 5000,
      });
      // A second return on the same order (defensive) must not mint promo.
      await service.releaseCheckoutReservation({
        brandId,
        orderId: 'order-1',
        amountPaise: 5000,
      });
      const b = await bal();
      expect(b.balancePaise).toBe(10000);
      expect(b.promoPaise).toBe(5000);
    });

    it('hasCompletionCredit reports whether an order was already rewarded', async () => {
      expect(await service.hasCompletionCredit('order-reward')).toBe(false);
      await reward();
      expect(await service.hasCompletionCredit('order-reward')).toBe(true);
      expect(await service.hasCompletionCredit('order-other')).toBe(false);
    });

    it('an admin debit also drains the reward bucket first', async () => {
      await reward();
      await service.adminAdjust({
        brandId,
        amountPaise: -2000,
        reason: 'reward granted in error',
        adminUserId: 'admin-1',
      });
      const b = await bal();
      expect(b.balancePaise).toBe(3000);
      expect(b.promoPaise).toBe(3000);
    });
  });

  describe('adminAdjust', () => {
    it('positive amount adds credit, negative removes it', async () => {
      await service.adminAdjust({
        brandId,
        amountPaise: 100000,
        reason: 'goodwill',
        adminUserId: 'admin-1',
      });
      expect((await bal()).balancePaise).toBe(100000);
      await service.adminAdjust({
        brandId,
        amountPaise: -40000,
        reason: 'correction',
        adminUserId: 'admin-1',
      });
      expect((await bal()).balancePaise).toBe(60000);
    });
  });
});
