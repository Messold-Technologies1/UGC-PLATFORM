import { PortfolioVisibilityStatus, Prisma } from '@prisma/client';
import { playableAssetWhere } from '../creator-portfolio/portfolio-video-asset.util';

/**
 * Attempt cap before a creator's preview is considered exhausted. Mirrors
 * PreviewVideoQueueService's default so the reconcile/backfill stop selecting
 * rows the queue has already parked as `dead`.
 */
export const PREVIEW_MAX_ATTEMPTS = 5;

/**
 * Selects listed creators whose card preview is genuinely owed:
 *   - never generated (`null`), `pending`, or `failed`, or stuck in
 *     `processing` past the stale window (crashed mid-run), AND
 *   - actually have a source video to encode (an intro, or a public playable
 *     portfolio video with an S3 object).
 *
 * Shared by the twice-monthly reconcile cron and the run-once backfill script so
 * both agree on exactly which rows need work — and so existing creators (status
 * `null`) are picked up as the initial backfill.
 */
export function previewReconcileWhere(
  staleProcessingBefore: Date,
): Prisma.CreatorProfileWhereInput {
  return {
    isListed: true,
    previewVideoAttempts: { lt: PREVIEW_MAX_ATTEMPTS },
    AND: [
      {
        OR: [
          { previewVideoStatus: null },
          { previewVideoStatus: { in: ['pending', 'failed'] } },
          {
            previewVideoStatus: 'processing',
            previewVideoUpdatedAt: { lte: staleProcessingBefore },
          },
        ],
      },
      {
        OR: [
          { introVideoKey: { not: null } },
          {
            portfolioVideos: {
              some: {
                visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
                videoKey: { not: null },
                ...playableAssetWhere(),
              },
            },
          },
        ],
      },
    ],
  };
}
