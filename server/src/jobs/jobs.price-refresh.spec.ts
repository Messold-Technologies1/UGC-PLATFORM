import { Prisma } from '@prisma/client';

import { JobsService } from './jobs.service';

/**
 * The rupee figure on a foreign-currency package is derived and goes stale as
 * rates move. This sweep keeps it close enough that the browse price and the
 * checkout price do not visibly diverge.
 */
describe('JobsService.refreshForeignPackagePrices', () => {
  function build(
    packages: Array<{
      id: string;
      priceCurrency: string;
      priceAmountOriginal: Prisma.Decimal | null;
    }>,
    convertToInr: jest.Mock,
  ) {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      creatorPackage: {
        findMany: jest.fn().mockResolvedValue(packages),
        update,
      },
    };
    const service = new JobsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      { convertToInr } as never,
    );
    return { service, prisma, update };
  }

  it('rewrites the derived rupee figure at the current rate', async () => {
    const convertToInr = jest
      .fn()
      .mockResolvedValue({ inr: 9345.79, rate: 93.4579, date: '2026-11-12' });
    const { service, update } = build(
      [
        {
          id: 'pkg-1',
          priceCurrency: 'USD',
          priceAmountOriginal: new Prisma.Decimal(100),
        },
      ],
      convertToInr,
    );

    await service.refreshForeignPackagePrices();

    expect(convertToInr).toHaveBeenCalledWith(100, 'USD');
    expect(update).toHaveBeenCalledTimes(1);
    const data = update.mock.calls[0][0];
    expect(data.where).toEqual({ id: 'pkg-1' });
    expect(Number(data.data.priceAmount)).toBe(9345.79);
  });

  it('skips a whole currency after its first failure', async () => {
    // One unreachable currency must not cost one upstream call per package.
    const convertToInr = jest.fn().mockResolvedValue(null);
    const { service, update } = build(
      [
        {
          id: 'pkg-1',
          priceCurrency: 'PKR',
          priceAmountOriginal: new Prisma.Decimal(1000),
        },
        {
          id: 'pkg-2',
          priceCurrency: 'PKR',
          priceAmountOriginal: new Prisma.Decimal(2000),
        },
        {
          id: 'pkg-3',
          priceCurrency: 'PKR',
          priceAmountOriginal: new Prisma.Decimal(3000),
        },
      ],
      convertToInr,
    );

    await service.refreshForeignPackagePrices();

    expect(convertToInr).toHaveBeenCalledTimes(1);
    // Those rows keep the figure they had rather than being zeroed.
    expect(update).not.toHaveBeenCalled();
  });

  it('carries on past a currency it cannot convert', async () => {
    const convertToInr = jest
      .fn()
      .mockImplementation(async (_amount: number, currency: string) =>
        currency === 'PKR'
          ? null
          : { inr: 9345.79, rate: 93.4579, date: '2026-11-12' },
      );
    const { service, update } = build(
      [
        {
          id: 'pkg-1',
          priceCurrency: 'PKR',
          priceAmountOriginal: new Prisma.Decimal(1000),
        },
        {
          id: 'pkg-2',
          priceCurrency: 'USD',
          priceAmountOriginal: new Prisma.Decimal(100),
        },
      ],
      convertToInr,
    );

    await service.refreshForeignPackagePrices();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].where).toEqual({ id: 'pkg-2' });
  });

  it('does not run twice at once', async () => {
    let release: (() => void) | undefined;
    const convertToInr = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({ inr: 1, rate: 1, date: '2026-11-12' });
        }),
    );
    const { service, prisma } = build(
      [
        {
          id: 'pkg-1',
          priceCurrency: 'USD',
          priceAmountOriginal: new Prisma.Decimal(100),
        },
      ],
      convertToInr,
    );

    const first = service.refreshForeignPackagePrices();
    await service.refreshForeignPackagePrices(); // returns immediately
    release?.();
    await first;

    expect(prisma.creatorPackage.findMany).toHaveBeenCalledTimes(1);
  });
});
