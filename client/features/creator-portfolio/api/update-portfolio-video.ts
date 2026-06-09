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
