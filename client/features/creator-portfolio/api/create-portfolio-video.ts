import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { PortfolioApiRequestOptions, PortfolioVideoApi } from "./types";


export type CreatePortfolioVideoPayload = {
  videoKey: string;
  thumbnailKey?: string;
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
  const endpoint = options?.adminCreatorId
    ? ENDPOINTS.ADMIN.CREATORS.PORTFOLIO_VIDEOS(options.adminCreatorId)
    : ENDPOINTS.CREATOR_PORTFOLIO.VIDEOS;

  const { data } = await api.post<PortfolioVideoApi>(
    endpoint,
    payload,
  );
  return data;
}
