import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { PortfolioApiRequestOptions, PortfolioVideoApi } from "./types";


export type CreatePortfolioVideoPayload = {
  videoKey: string;
  thumbnailKey?: string;
  /** SHA-256 hex of the uploaded video, when it was small enough to hash. */
  contentHash?: string;
  industryLabel?: string;
  tags?: string[];
  language?: string;
  description?: string;
  visibilityStatus: "public" | "private";
};

export async function createPortfolioVideo(
  payload: CreatePortfolioVideoPayload,
  options?: PortfolioApiRequestOptions,
): Promise<PortfolioVideoApi> {
  const endpoint = ENDPOINTS.CREATOR_PORTFOLIO.VIDEOS;
  const finalPayload = options?.adminCreatorId
    ? { ...payload, creatorId: options.adminCreatorId }
    : payload;

  const { data } = await api.post<PortfolioVideoApi>(
    endpoint,
    finalPayload,
  );
  return data;
}
