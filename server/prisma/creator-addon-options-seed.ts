import type { PrismaClient } from '@prisma/client';

type AddOnOptionSeedRow = {
  slug: string;
  name: string;
  sortOrder: number;
  mandatory?: boolean;
  fixedPrice?: number;
  minPrice?: number;
  stepPrice?: number;
};

export const CREATOR_ADDON_OPTION_SEED_ROWS: AddOnOptionSeedRow[] = [
  {
    slug: 'extra_revision',
    name: 'Revision',
    sortOrder: 0,
    mandatory: true,
    minPrice: 100,
    stepPrice: 100,
  },
  {
    slug: 'paid_ads_usage_30_days',
    name: 'Usage Rights extra 30 days',
    sortOrder: 1,
    mandatory: true,
    minPrice: 100,
    stepPrice: 100,
  },
  {
    slug: 'on_location_shoot',
    name: 'Travel within City',
    sortOrder: 2,
    mandatory: false,
    fixedPrice: 500,
  },
];

export async function seedCreatorAddOnOptions(
  prisma: PrismaClient,
): Promise<void> {
  for (const row of CREATOR_ADDON_OPTION_SEED_ROWS) {
    await prisma.creatorAddOnOption.upsert({
      where: { slug: row.slug },
      create: { ...row, mandatory: row.mandatory ?? false },
      update: {
        name: row.name,
        sortOrder: row.sortOrder,
        mandatory: row.mandatory ?? false,
        fixedPrice: row.fixedPrice ?? null,
        minPrice: row.minPrice ?? null,
        stepPrice: row.stepPrice ?? null,
      },
    });
  }
}

