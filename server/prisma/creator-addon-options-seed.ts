import type { PrismaClient } from '@prisma/client';

type AddOnOptionSeedRow = {
  slug: string;
  name: string;
  sortOrder: number;
  fixedPrice?: number;
  minPrice?: number;
  stepPrice?: number;
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
    slug: 'faster_delivery_2_3_days',
    name: 'Faster Delivery (2-3 days)',
    sortOrder: 1,
    minPrice: 100,
    stepPrice: 100,
  },
  {
    slug: 'on_location_shoot',
    name: 'On-location Shoot',
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
];

export async function seedCreatorAddOnOptions(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.creatorAddOnOption.createMany({
    data: CREATOR_ADDON_OPTION_SEED_ROWS,
    skipDuplicates: true,
  });
}

