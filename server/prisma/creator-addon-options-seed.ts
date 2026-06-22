import type { PrismaClient } from '@prisma/client';

type AddOnOptionSeedRow = {
  slug: string;
  name: string;
  sortOrder: number;
  fixedPrice?: number;
  minPrice?: number;
  stepPrice?: number;
  affectsDeliveryDays?: boolean;
};

export const CREATOR_ADDON_OPTION_SEED_ROWS: AddOnOptionSeedRow[] = [
  {
    slug: 'extra_revision',
    name: 'Extra Revision',
    sortOrder: 0,
    minPrice: 100,
    stepPrice: 100,
  },
  {
    slug: 'faster_delivery',
    name: 'Faster Delivery',
    sortOrder: 1,
    minPrice: 100,
    stepPrice: 100,
    affectsDeliveryDays: true,
  },
  {
    slug: 'on_location_shoot',
    name: 'On-location Shoot (25 km)',
    sortOrder: 2,
    fixedPrice: 500,
  },
  {
    slug: 'paid_ads_usage_30_days',
    name: 'Paid Ads Usage (30 days)',
    sortOrder: 3,
    minPrice: 100,
    stepPrice: 100,
  },
  {
    slug: 'advanced_editing',
    name: 'Advanced Editing',
    sortOrder: 4,
    minPrice: 100,
    stepPrice: 100,
  },
  {
    slug: 'raw_file_usage',
    name: 'Raw File Usage',
    sortOrder: 5,
    minPrice: 100,
    stepPrice: 100,
  },
];

export async function seedCreatorAddOnOptions(
  prisma: PrismaClient,
): Promise<void> {
  for (const row of CREATOR_ADDON_OPTION_SEED_ROWS) {
    await prisma.creatorAddOnOption.upsert({
      where: { slug: row.slug },
      create: row,
      update: {
        name: row.name,
        sortOrder: row.sortOrder,
        fixedPrice: row.fixedPrice ?? null,
        minPrice: row.minPrice ?? null,
        stepPrice: row.stepPrice ?? null,
        affectsDeliveryDays: row.affectsDeliveryDays ?? false,
      },
    });
  }
}

