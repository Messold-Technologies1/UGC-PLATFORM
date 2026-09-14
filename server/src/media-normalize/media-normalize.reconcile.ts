import { PortfolioVisibilityStatus, Prisma } from '@prisma/client';

/** Attempt cap before a video is parked `dead`. Mirrors the queue default. */
export const NORMALIZE_MAX_ATTEMPTS = 5;
/** How old a `processing` row must be before it's treated as abandoned. */
export const NORMALIZE_STALE_PROCESSING_MS = 600_000; // 10 min

/** Portfolio videos that owe normalization: have an S3 object, not yet done. */
export function portfolioNormalizeOwedWhere(
  staleBefore: Date,
): Prisma.CreatorPortfolioVideoWhereInput {
  return {
    videoKey: { not: null },
    videoNormalizeAttempts: { lt: NORMALIZE_MAX_ATTEMPTS },
    OR: [
      { videoNormalizeStatus: null },
      { videoNormalizeStatus: { in: ['pending', 'failed'] } },
      {
        videoNormalizeStatus: 'processing',
        videoNormalizeUpdatedAt: { lte: staleBefore },
      },
    ],
  };
}

/** Creators whose intro video owes normalization. */
export function introNormalizeOwedWhere(
  staleBefore: Date,
): Prisma.CreatorProfileWhereInput {
  return {
    introVideoKey: { not: null },
    introVideoNormalizeAttempts: { lt: NORMALIZE_MAX_ATTEMPTS },
    OR: [
      { introVideoNormalizeStatus: null },
      { introVideoNormalizeStatus: { in: ['pending', 'failed'] } },
      {
        introVideoNormalizeStatus: 'processing',
        introVideoNormalizeUpdatedAt: { lte: staleBefore },
      },
    ],
  };
}

/** Only public, playable portfolio rows are worth normalizing eagerly. */
export function playableForNormalize(): Prisma.CreatorPortfolioVideoWhereInput {
  return { visibilityStatus: PortfolioVisibilityStatus.PUBLIC };
}
