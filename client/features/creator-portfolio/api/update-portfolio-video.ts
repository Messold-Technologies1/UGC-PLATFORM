import api from "@/lib/api";
import { ENDPOINTS, creatorPortfolioVideoPath } from "@/lib/endpoints";
import type { PortfolioApiRequestOptions, PortfolioVideoApi } from "./types";

export type UpdatePortfolioVideoPayload = {
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
  const endpoint = options?.adminCreatorId
    ? ENDPOINTS.ADMIN.CREATORS.PORTFOLIO_VIDEO(options.adminCreatorId, videoId)
    : creatorPortfolioVideoPath(videoId);

  const { data } = await api.patch<PortfolioVideoApi>(
    endpoint,
    payload,
  );
  return data;
}
