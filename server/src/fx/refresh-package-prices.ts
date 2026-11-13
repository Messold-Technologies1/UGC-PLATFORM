import { Prisma, PrismaClient } from '@prisma/client';

import { roundConvertedInr } from './round-converted-inr';

/** Just enough of FxService to convert; lets the script and tests pass stubs. */
export type InrConverter = {
  convertToInr: (
    amount: number,
    currency: string,
  ) => Promise<{ inr: number; rate: number; date: string } | null>;
};

/**
 * Only the model this sweep touches, so the Nest-injected PrismaService and a
 * bare PrismaClient built by a one-off script both satisfy it.
 */
export type PackagePriceStore = Pick<PrismaClient, 'creatorPackage'>;

export type PriceRefreshResult = {
  considered: number;
  updated: number;
  /** Currencies the rates upstream could not convert, each tried only once. */
  failedCurrencies: string[];
};

/**
 * Re-convert the rupee price of every package priced in another currency.
 *
 * A creator outside India names their price in their own currency, and
 * `priceAmount` holds the rupee conversion of it. That rupee figure is the
 * real price -- what brands browse and what Razorpay charges -- so nothing
 * converts at checkout and a brand always pays the number they were shown.
 *
 * The cost of that is a price which would otherwise freeze at whatever the
 * rate was the day the creator saved, so this run is what keeps it honest.
 *
 * Lives here rather than in the job so it can also be run by hand: a nightly
 * job whose only evidence is a log line at 01:30 is hard to trust, and this
 * is also the recovery path if a run is missed.
 *
 * Rates are fetched once per currency, not once per package, and a currency
 * that fails leaves those rows at their previous value rather than abandoning
 * the whole sweep.
 */
export async function refreshForeignPackagePrices(
  prisma: PackagePriceStore,
  fx: InrConverter,
): Promise<PriceRefreshResult> {
  const packages = await prisma.creatorPackage.findMany({
    where: {
      priceCurrency: { not: 'INR' },
      priceAmountOriginal: { not: null },
    },
    select: { id: true, priceCurrency: true, priceAmountOriginal: true },
  });

  let updated = 0;
  const failedCurrencies = new Set<string>();

  for (const pkg of packages) {
    const currency = pkg.priceCurrency.trim().toUpperCase();
    if (failedCurrencies.has(currency) || pkg.priceAmountOriginal == null) {
      continue;
    }

    const converted = await fx.convertToInr(
      Number(pkg.priceAmountOriginal),
      currency,
    );
    if (!converted) {
      // Note it once and skip every other package in that currency.
      failedCurrencies.add(currency);
      continue;
    }

    await prisma.creatorPackage.update({
      where: { id: pkg.id },
      data: {
        // Same rounding as the save path and the pricing form, so a package's
        // price does not shift the first time this touches it.
        priceAmount: new Prisma.Decimal(roundConvertedInr(converted.inr)),
        priceInrUpdatedAt: new Date(),
      },
      // Without this Prisma reads the whole row back for every package, which
      // a sweep over every foreign-priced package has no use for.
      select: { id: true },
    });
    updated += 1;
  }

  return {
    considered: packages.length,
    updated,
    failedCurrencies: [...failedCurrencies],
  };
}
