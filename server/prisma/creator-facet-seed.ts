import type { PrismaClient } from '@prisma/client';
import { CreatorFacetDimension } from '@prisma/client';

type FacetRow = {
  dimension: CreatorFacetDimension;
  slug: string;
  label: string;
  sortOrder: number;
};

export const CREATOR_FACET_SEED_ROWS: FacetRow[] = [
  ...[
    ['hindi', 'Hindi'],
    ['english', 'English'],
    ['bengali', 'Bengali'],
    ['marathi', 'Marathi'],
    ['telugu', 'Telugu'],
    ['tamil', 'Tamil'],
    ['gujarati', 'Gujarati'],
    ['urdu', 'Urdu'],
    ['kannada', 'Kannada'],
    ['odia', 'Odia'],
    ['malayalam', 'Malayalam'],
    ['punjabi', 'Punjabi'],
    ['assamese', 'Assamese'],
    ['maithili', 'Maithili'],
    ['sanskrit', 'Sanskrit'],
    ['kashmiri', 'Kashmiri'],
    ['konkani', 'Konkani'],
    ['sindhi', 'Sindhi'],
    ['dogri', 'Dogri'],
    ['manipuri_meitei', 'Manipuri / Meitei'],
    ['bodo', 'Bodo'],
    ['santali', 'Santali'],
    ['nepali', 'Nepali'],
    ['other', 'Other'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.LANGUAGE,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['mom', 'Mom'],
    ['dad', 'Dad'],
    ['couple', 'Couple'],
    ['family', 'Family'],
    ['senior', 'Senior'],
    ['pet', 'Pet'],
    ['individual_solo', 'Individual / Solo'],
    ['other', 'Other'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.CREATOR_TYPE,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['lifestyle', 'Lifestyle'],
    ['fashion', 'Fashion'],
    ['beauty', 'Beauty'],
    ['fitness', 'Fitness'],
    ['food', 'Food'],
    ['travel', 'Travel'],
    ['tech', 'Tech'],
    ['parenting', 'Parenting'],
    ['gaming', 'Gaming'],
    ['finance', 'Finance'],
    ['education', 'Education'],
    ['home', 'Home'],
    ['automobile', 'Automobile'],
    ['pets', 'Pets'],
    ['business', 'Business'],
    ['health', 'Health'],
    ['comedy', 'Comedy'],
    ['other', 'Other'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.CONTENT_CATEGORY,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['full_time_creator', 'Full-time Creator'],
    ['student', 'Student'],
    ['working_professional', 'Working Professional'],
    ['entrepreneur', 'Entrepreneur'],
    ['homemaker', 'Homemaker'],
    ['doctor', 'Doctor'],
    ['nutritionist', 'Nutritionist'],
    ['fitness_trainer', 'Fitness Trainer'],
    ['teacher', 'Teacher'],
    ['chef', 'Chef'],
    ['engineer', 'Engineer'],
    ['lawyer', 'Lawyer'],
    ['ca', 'CA'],
    ['artist', 'Artist'],
    ['actor', 'Actor'],
    ['model', 'Model'],
    ['other', 'Other'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.OCCUPATION,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['slim_lean', 'Slim / Lean'],
    ['midsize', 'Midsize'],
    ['plus_size_curvy', 'Plus Size / Curvy'],
    ['athletic_fit', 'Athletic / Fit'],
    ['other', 'Other'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.APPEARANCE,
    slug,
    label,
    sortOrder: i,
  })),
];

export async function seedCreatorFacetOptions(prisma: PrismaClient): Promise<void> {
  await prisma.creatorFacetOption.createMany({
    data: CREATOR_FACET_SEED_ROWS.map((r) => ({
      dimension: r.dimension,
      slug: r.slug,
      label: r.label,
      sortOrder: r.sortOrder,
    })),
    skipDuplicates: true,
  });
}
