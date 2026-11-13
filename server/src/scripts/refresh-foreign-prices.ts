import { Prisma, PrismaClient } from '@prisma/client';

import { FxService } from '../fx/fx.service';
import { refreshForeignPackagePrices } from '../fx/refresh-package-prices';

/**
 * Re-convert every foreign-currency package price to rupees, now.
 *
 * The same sweep the worker runs nightly, runnable by hand. Two reasons it
 * exists:
 *
 *   1. A nightly job whose only evidence is a log line at 01:30 IST is hard
 *      to trust. Run this straight after a deploy and you know it works.
 *   2. It is the recovery path. If the rates upstream was down at 20:00 UTC,
 *      or the worker was restarting, prices sit a day stale until the next
 *      run -- unless someone runs this.
 *
 * Usage, from /opt/gocollab/current on the EC2 host:
 *
 *   npm run refresh:prices              # dry run, changes nothing
 *   npm run refresh:prices -- --apply   # actually writes
 *
 * Dry run is the default deliberately: this rewrites the price brands pay.
 */
const APPLY = process.argv.includes('--apply');

const prisma = new PrismaClient();

/**
 * FxService only reads FX_RATES_URL, and falls back to the public endpoint
 * when it is unset, so the real ConfigService is more than this needs.
 */
const config = {
  get: (key: string) => process.env[key],
} as never;

async function main(): Promise<void> {
  const fx = new FxService(config);

  const before = await prisma.creatorPackage.findMany({
    where: { priceCurrency: { not: 'INR' }, priceAmountOriginal: { not: null } },
    select: {
      id: true,
      priceAmount: true,
      priceCurrency: true,
      priceAmountOriginal: true,
      priceInrUpdatedAt: true,
      creator: { select: { displayName: true } },
    },
  });

  if (before.length === 0) {
    console.log(
      'No packages are priced in a currency other than INR. Nothing to do.',
    );
    return;
  }

  // In a dry run the sweep runs for real but its writes go nowhere, so the
  // numbers printed are the ones it would have stored -- not a re-derivation
  // that could disagree with it.
  const planned = new Map<string, Prisma.Decimal>();
  const store = APPLY
    ? prisma
    : ({
        creatorPackage: {
          findMany: prisma.creatorPackage.findMany.bind(
            prisma.creatorPackage,
          ) as unknown,
          update: (args: {
            where: { id: string };
            data: { priceAmount: Prisma.Decimal };
          }) => {
            planned.set(args.where.id, args.data.priceAmount);
            return Promise.resolve({});
          },
        },
      } as never);

  const result = await refreshForeignPackagePrices(store, fx);

  const widthName = Math.max(
    ...before.map((p) => (p.creator?.displayName ?? p.id).length),
    7,
  );
  console.log(
    `${'creator'.padEnd(widthName)}  ${'priced'.padEnd(14)}  ${'stored now'.padEnd(12)}  ${APPLY ? 'written' : 'would write'}`,
  );

  let moved = 0;
  for (const pkg of before) {
    const now = APPLY
      ? (
          await prisma.creatorPackage.findUnique({
            where: { id: pkg.id },
            select: { priceAmount: true },
          })
        )?.priceAmount
      : planned.get(pkg.id);
    const was = Number(pkg.priceAmount);
    const next = now == null ? null : Number(now);
    if (next != null && next !== was) moved += 1;
    console.log(
      `${(pkg.creator?.displayName ?? pkg.id).padEnd(widthName)}  ` +
        `${`${pkg.priceCurrency} ${String(pkg.priceAmountOriginal)}`.padEnd(14)}  ` +
        `${`Rs ${was}`.padEnd(12)}  ` +
        `${next == null ? '(rate unavailable)' : `Rs ${next}`}`,
    );
  }

  console.log();
  console.log(
    `${result.considered} package(s) priced in another currency, ` +
      `${result.updated} converted, ${moved} at a different rupee figure than before.`,
  );
  if (result.failedCurrencies.length > 0) {
    console.log(
      `Could not get rates for: ${result.failedCurrencies.join(', ')}. ` +
        'Those keep their previous rupee price.',
    );
  }
  if (!APPLY) {
    console.log();
    console.log('Dry run — nothing was written. Re-run with --apply to save.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
