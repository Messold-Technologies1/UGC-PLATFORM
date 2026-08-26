import api from "@/lib/api";
import { creatorPortfolioVideoPath } from "@/lib/endpoints";
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
  /**
   * SHA-256 of the replacement video. Overwrites the row's stored hash so a
   * later duplicate check compares against the file actually in this slot,
   * not the one it replaced. Omit when the file couldn't be hashed client-side
   * (e.g. over the hashing size cap) — the server then clears the stored hash.
   */
  contentHash?: string;
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

  const { data } = await api.patch<PortfolioVideoApi>(endpoint, finalPayload);
  return data;
}
