import { Prisma } from '@prisma/client';

import { OrdersService } from './orders.service';

/**
 * A creator outside India prices in their own currency. The rupee figure
 * stored on the package is only a browse/search convenience and goes stale
 * as rates move; the amount a brand is actually charged has to be converted
 * at checkout, from the currency and amount the creator really entered.
 *
 * These tests pin that down at `computeOrderDraftForItem`, which is the one
 * place both the single and the bulk checkout price an item, and which
 * produces both `amountPaise` (what Razorpay is asked for) and the `pkg`
 * whose `priceAmount` is frozen into `priceAmountSnapshot`.
 */
describe('OrdersService foreign-currency checkout pricing', () => {
  const STALE_STORED_INR = 80_000; // what the derived column happens to hold
  const ENTERED_USD = 1_000;
  const LIVE_INR = 90_000; // 1000 USD at the rate in force right now

  function build(
    pkgOverrides: Record<string, unknown>,
    convertToInr: jest.Mock,
    addOns: Array<{ id: string; priceAmount: Prisma.Decimal }> = [],
  ) {
    const pkg = {
      id: 'pkg-1',
      creatorId: 'creator-1',
      name: 'Reel package',
      deliverables: ['1 Reel'],
      deliveryDays: 5,
      maxRevisions: 1,
      priceAmount: new Prisma.Decimal(STALE_STORED_INR),
      priceCurrency: 'INR',
      priceAmountOriginal: null,
      creator: { id: 'creator-1', unavailability: null },
      ...pkgOverrides,
    };
    const prisma = {
      creatorPackage: { findFirst: jest.fn().mockResolvedValue(pkg) },
      creatorAddOn: { findMany: jest.fn().mockResolvedValue(addOns) },
      creatorAddOnOption: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Revision' }),
      },
    };
    // Only prisma and fx matter here; the rest are unused on this path.
    const service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { convertToInr } as never,
    );
    return { service, prisma, pkg };
  }

  function draft(service: OrdersService, addOnIds?: string[]) {
    return (
      service as unknown as {
        computeOrderDraftForItem: (p: {
          creatorId: string;
          packageId?: string;
          addOnIds?: string[];
        }) => Promise<{
          pkg: { priceAmount: Prisma.Decimal };
          packageAmountPaise: number;
          amountPaise: number;
        }>;
      }
    ).computeOrderDraftForItem({
      creatorId: 'creator-1',
      packageId: 'pkg-1',
      addOnIds,
    });
  }

  it('charges the live conversion, not the stale rupee figure on the row', async () => {
    const convertToInr = jest
      .fn()
      .mockResolvedValue({ inr: LIVE_INR, rate: 90, date: '2026-11-12' });
    const { service } = build(
      {
        priceCurrency: 'USD',
        priceAmountOriginal: new Prisma.Decimal(ENTERED_USD),
      },
      convertToInr,
    );

    const result = await draft(service);

    expect(convertToInr).toHaveBeenCalledWith(ENTERED_USD, 'USD');
    // What Razorpay is asked for.
    expect(result.packageAmountPaise).toBe(LIVE_INR * 100);
    expect(result.amountPaise).toBe(LIVE_INR * 100);
    // What gets frozen into priceAmountSnapshot -- the same number, so the
    // charge and the order record can never disagree.
    expect(Number(result.pkg.priceAmount)).toBe(LIVE_INR);
    expect(result.packageAmountPaise).not.toBe(STALE_STORED_INR * 100);
  });

  it('leaves a rupee-priced package completely alone', async () => {
    const convertToInr = jest.fn();
    const { service } = build({}, convertToInr);

    const result = await draft(service);

    expect(convertToInr).not.toHaveBeenCalled();
    expect(result.packageAmountPaise).toBe(STALE_STORED_INR * 100);
  });

  it('falls back to the stored rupee price when rates are unreachable', async () => {
    // A third-party outage must not be able to block a purchase.
    const convertToInr = jest.fn().mockResolvedValue(null);
    const { service } = build(
      {
        priceCurrency: 'USD',
        priceAmountOriginal: new Prisma.Decimal(ENTERED_USD),
      },
      convertToInr,
    );

    const result = await draft(service);

    expect(convertToInr).toHaveBeenCalled();
    expect(result.packageAmountPaise).toBe(STALE_STORED_INR * 100);
  });

  it('adds add-ons on top in rupees, without converting them', async () => {
    // Add-on prices are platform-constrained in rupees
    // (CreatorAddOnOption.fixedPrice / minPrice / stepPrice), so they are
    // never in the creator's own currency and must not be converted.
    const convertToInr = jest
      .fn()
      .mockResolvedValue({ inr: LIVE_INR, rate: 90, date: '2026-11-12' });
    const { service } = build(
      {
        priceCurrency: 'USD',
        priceAmountOriginal: new Prisma.Decimal(ENTERED_USD),
      },
      convertToInr,
      [{ id: 'addon-1', priceAmount: new Prisma.Decimal(2_000) }],
    );

    const result = await draft(service, ['addon-1']);

    expect(convertToInr).toHaveBeenCalledTimes(1);
    expect(result.amountPaise).toBe((LIVE_INR + 2_000) * 100);
  });
});
