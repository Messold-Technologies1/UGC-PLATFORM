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
