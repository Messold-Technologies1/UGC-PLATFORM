import { BadRequestException } from '@nestjs/common';
import { WalletTransactionType, WalletWithdrawalStatus } from '@prisma/client';

import { WalletService } from './wallet.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * In-memory fake of the Prisma surface WalletService uses. Models the two
 * money-critical behaviours:
 *  - balance/held changes go through updateMany with an optimistic compare-and-set
 *    (where matches the read balancePaise + heldPaise); the fake applies the
 *    absolute next values only when they still match;
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
        : this.wallets.get(where.id);
      return w ? { ...w } : null;
    },
    findUniqueOrThrow: async (args: any) => {
      const w = await this.brandWallet.findUnique(args);
      if (!w) throw new Error('wallet not found');
      return w;
    },
    create: async ({ data }: any) => {
      if ([...this.wallets.values()].some((x) => x.brandId === data.brandId)) {
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
        brandId: data.brandId,
        balancePaise: data.balancePaise ?? 0,
        heldPaise: data.heldPaise ?? 0,
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
      if (data.balancePaise !== undefined) w.balancePaise = data.balancePaise;
      if (data.heldPaise !== undefined) w.heldPaise = data.heldPaise;
      return { count: 1 };
    },
  };

  walletTransaction = {
    create: async ({ data }: any) => {
      const row = { id: this.id('txn'), createdAt: new Date(), ...data };
      this.txns.push(row);
      return { ...row };
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
      withdrawals: new Map([...this.withdrawals].map(([k, v]) => [k, { ...v }])),
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
