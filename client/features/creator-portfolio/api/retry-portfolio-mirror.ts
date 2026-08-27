import api from "@/lib/api";
import { portfolioRetryMirrorPath } from "@/lib/endpoints";

import type { PortfolioApiRequestOptions } from "./types";

/**
 * Re-queue the Instagram copy for a video whose mirror failed. Returns once the
 * job is queued, not once it finishes — the grid picks up the new state on its
 * next poll.
 */
export async function retryPortfolioMirror(
  videoId: string,
  options?: PortfolioApiRequestOptions,
): Promise<{ requeued: true }> {
  const { data } = await api.post<{ requeued: true }>(
    portfolioRetryMirrorPath(videoId),
    options?.adminCreatorId ? { creatorId: options.adminCreatorId } : {},
  );
  return data;
}
