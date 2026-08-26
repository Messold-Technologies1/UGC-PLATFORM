import api from "@/lib/api";
import { ENDPOINTS, creatorPortfolioVideoPath } from "@/lib/endpoints";
import type { PortfolioApiRequestOptions, PortfolioVideoApi } from "./types";

export type UpdatePortfolioVideoPayload = {
  /**
   * Replacement video: S3 key of an already-uploaded file. Swaps the clip on an
   * existing entry — the only way to change a video once the portfolio is at the
   * minimum-videos floor, where deleting is refused.
   */
  videoKey?: string;
  /** Thumbnail for the replacement. Omitting it clears the outgoing one. */
  thumbnailKey?: string;
  industryLabel?: string;
  tags?: string[];
  language?: string;
  description?: string;
  visibilityStatus?: "public" | "private";
};

export async function updatePortfolioVideo(
  videoId: string,
  payload: UpdatePortfolioVideoPayload,
  options?: PortfolioApiRequestOptions,
): Promise<PortfolioVideoApi> {
  const endpoint = creatorPortfolioVideoPath(videoId);
  const finalPayload = options?.adminCreatorId
    ? { ...payload, creatorId: options.adminCreatorId }
    : payload;

  const { data } = await api.patch<PortfolioVideoApi>(
    endpoint,
    finalPayload,
  );
  return data;
}
