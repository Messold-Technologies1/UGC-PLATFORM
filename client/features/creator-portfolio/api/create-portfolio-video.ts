import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { PortfolioVideoApi } from "./types";

/** Matches Nest `CreatePortfolioVideoDto`. */
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
): Promise<PortfolioVideoApi> {
  const { data } = await api.post<PortfolioVideoApi>(
    ENDPOINTS.CREATOR_PORTFOLIO.VIDEOS,
    payload,
  );
  return data;
}
