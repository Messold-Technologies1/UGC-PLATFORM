import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { PortfolioVideoApi } from "./types";

export const portfolioAdminVideosQueryKey = (creatorId?: string) =>
  ["creator-portfolio", "videos", "admin", creatorId] as const;

export async function listAdminPortfolioVideos(
  creatorId?: string,
): Promise<PortfolioVideoApi[]> {
  const url = new URL(ENDPOINTS.CREATOR_PORTFOLIO.VIDEOS_ADMIN, window.location.origin);
  if (creatorId) {
    url.searchParams.set("creatorId", creatorId);
  }

  const { data } = await api.get<PortfolioVideoApi[]>(url.pathname + url.search);
  return data;
}
