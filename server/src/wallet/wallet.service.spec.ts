import { BadRequestException } from '@nestjs/common';
import { WalletTransactionType, WalletWithdrawalStatus } from '@prisma/client';

import { WalletService } from './wallet.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * In-memory fake of the Prisma surface WalletService uses. Models the two
 * money-critical behaviours:
 *  - the conditional debit (updateMany with balancePaise >= need) returns
 *    count 0 when the balance is short, so the balance can never go negative;
 *  - $transaction snapshots and restores state on throw, so a failed debit
 *    rolls back an already-created withdrawal row.
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
        currency: data.currency ?? 'INR',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.wallets.set(w.id, w);
      return { ...w };
    },
    update: async ({ where, data }: any) => {
      const w = this.wallets.get(where.id);
      if (!w) throw new Error('nf');
      if (data.balancePaise?.increment != null)
        w.balancePaise += data.balancePaise.increment;
      if (data.balancePaise?.decrement != null)
        w.balancePaise -= data.balancePaise.decrement;
      w.updatedAt = new Date();
      return { ...w };
    },
    updateMany: async ({ where, data }: any) => {
      const w = this.wallets.get(where.id);
      if (!w) return { count: 0 };
      if (where.balancePaise?.gte != null && w.balancePaise < where.balancePaise.gte)
        return { count: 0 };
      if (data.balancePaise?.decrement != null)
        w.balancePaise -= data.balancePaise.decrement;
      if (data.balancePaise?.increment != null)
        w.balancePaise += data.balancePaise.increment;
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
        brandNote: null,
        adminNote: null,
        processedByUserId: null,
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
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
      Object.assign(w, data, { updatedAt: new Date() });
      return { ...w };
    },
    aggregate: async ({ where }: any) => {
      const rows = [...this.withdrawals.values()].filter(
        (w) => w.brandId === where.brandId && w.status === where.status,
      );
      return {
        _sum: { amountPaise: rows.reduce((a, b) => a + b.amountPaise, 0) },
      };
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

  const balance = () => service.getBalance(brandId).then((b) => b.balancePaise);

  it('credits create the wallet lazily and increase the balance', async () => {
    const { balanceAfterPaise } = await service.credit({
      brandId,
      amountPaise: 500000,
      type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
    });
    expect(balanceAfterPaise).toBe(500000);
    expect(await balance()).toBe(500000);
    expect(prisma.txns).toHaveLength(1);
    expect(prisma.txns[0].amountPaise).toBe(500000);
    expect(prisma.txns[0].balanceAfterPaise).toBe(500000);
  });

  it('rejects a debit that would overdraw and leaves the balance untouched', async () => {
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
    expect(await balance()).toBe(300000);
  });

  it('spends credit at checkout and reverses it on abandon (round-trips to zero net)', async () => {
    await service.credit({
      brandId,
      amountPaise: 700000,
      type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
    });
    await service.reserveForCheckout({
      brandId,
      orderId: 'order-1',
      amountPaise: 700000,
    });
    expect(await balance()).toBe(0);
    await service.releaseCheckoutReservation({
      brandId,
      orderId: 'order-1',
      amountPaise: 700000,
    });
    expect(await balance()).toBe(700000);
  });

  it('records a signed, balance-snapshotted ledger for a credit → debit sequence', async () => {
    await service.credit({
      brandId,
      amountPaise: 1000000,
      type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
    });
    await service.debit({
      brandId,
      amountPaise: 200000,
      type: WalletTransactionType.ORDER_CHECKOUT_DEBIT,
      orderId: 'order-9',
    });
    const rows = prisma.txns;
    expect(rows[0]).toMatchObject({ amountPaise: 1000000, balanceAfterPaise: 1000000 });
    expect(rows[1]).toMatchObject({ amountPaise: -200000, balanceAfterPaise: 800000 });
    // Balance always equals the sum of the ledger.
    expect(rows.reduce((a, r) => a + r.amountPaise, 0)).toBe(await balance());
  });

  describe('withdrawals', () => {
    beforeEach(async () => {
      await service.credit({
        brandId,
        amountPaise: 800000,
        type: WalletTransactionType.ORDER_CANCELLATION_CREDIT,
      });
    });

    it('debits the balance immediately when requested', async () => {
      const w = await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 500000,
      });
      expect(w.status).toBe(WalletWithdrawalStatus.REQUESTED);
      expect(await balance()).toBe(300000);
      const bal = await service.getBalance(brandId);
      expect(bal.pendingWithdrawalPaise).toBe(500000);
    });

    it('rolls back the withdrawal row when credit is insufficient', async () => {
      await expect(
        service.requestWithdrawal({
          brandId,
          requestedByUserId: 'user-1',
          amountPaise: 900000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.withdrawals.size).toBe(0);
      expect(await balance()).toBe(800000);
    });

    it('completing a withdrawal moves no money', async () => {
      const w = await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 500000,
      });
      const done = await service.completeWithdrawal({
        withdrawalId: w.id,
        processedByUserId: 'admin-1',
      });
      expect(done.status).toBe(WalletWithdrawalStatus.COMPLETED);
      expect(await balance()).toBe(300000);
    });

    it('rejecting a withdrawal returns the money to credits', async () => {
      const w = await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 500000,
      });
      await service.rejectWithdrawal({
        withdrawalId: w.id,
        processedByUserId: 'admin-1',
        adminNote: 'bad details',
      });
      expect(await balance()).toBe(800000);
    });

    it('a brand cancelling its own pending withdrawal returns the money', async () => {
      const w = await service.requestWithdrawal({
        brandId,
        requestedByUserId: 'user-1',
        amountPaise: 500000,
      });
      await service.cancelWithdrawalByBrand({ withdrawalId: w.id, brandId });
      expect(await balance()).toBe(800000);
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
      expect(await balance()).toBe(100000);
      await service.adminAdjust({
        brandId,
        amountPaise: -40000,
        reason: 'correction',
        adminUserId: 'admin-1',
      });
      expect(await balance()).toBe(60000);
    });

    it('requires a reason and a non-zero amount', async () => {
      await expect(
        service.adminAdjust({
          brandId,
          amountPaise: 1000,
          reason: '   ',
          adminUserId: 'admin-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.adminAdjust({
          brandId,
          amountPaise: 0,
          reason: 'x',
          adminUserId: 'admin-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
