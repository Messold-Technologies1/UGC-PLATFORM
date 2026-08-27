import type { PortfolioVideoApi } from "../api/types";

/**
 * Shared prefix of both portfolio video query keys (`…/me` and `…/admin/<id>`),
 * so a realtime event can refresh whichever one is mounted without knowing
 * which view the viewer is in.
 */
export const portfolioVideosBaseQueryKey = [
  "creator-portfolio",
  "videos",
] as const;

/**
 * Only an Instagram import is ever PROCESSING or FAILED — an upload creates its
 * row after the file is already in storage, so it is READY from the start.
 */
export function countByAssetState(videos: PortfolioVideoApi[] | undefined): {
  processing: number;
  failed: number;
} {
  let processing = 0;
  let failed = 0;
  for (const video of videos ?? []) {
    if (video.assetState === "PROCESSING") processing++;
    else if (video.assetState === "FAILED") failed++;
  }
  return { processing, failed };
}

export function hasProcessingVideos(
  videos: PortfolioVideoApi[] | undefined,
): boolean {
  return (videos ?? []).some((video) => video.assetState === "PROCESSING");
}
