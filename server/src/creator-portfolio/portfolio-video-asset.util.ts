import { PortfolioVideoAssetState, Prisma } from '@prisma/client';

/**
 * The asset states whose bytes can actually be played.
 *
 * An Instagram import is created before its mirror finishes, so a PROCESSING
 * row has no `videoUrl` yet and a FAILED one never will. Both must be excluded
 * from anything a brand sees, and from the go-live count — otherwise a creator
 * could publish a profile whose three "videos" render as empty players.
 *
 * LINK_ONLY is playable: it is a deliberate never-mirror row that serves its
 * Instagram URL directly.
 */
export const PLAYABLE_ASSET_STATES: PortfolioVideoAssetState[] = [
  PortfolioVideoAssetState.READY,
  PortfolioVideoAssetState.LINK_ONLY,
];

/**
 * `where` fragment for every read that surfaces a portfolio video publicly, or
 * counts one toward go-live. Spread it alongside the visibility filter:
 *
 *   where: { visibilityStatus: PUBLIC, ...playableAssetWhere() }
 */
export function playableAssetWhere(): Prisma.CreatorPortfolioVideoWhereInput {
  return { assetState: { in: PLAYABLE_ASSET_STATES } };
}
