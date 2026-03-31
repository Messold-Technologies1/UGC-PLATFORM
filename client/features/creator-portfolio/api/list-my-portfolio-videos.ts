import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { PortfolioVideoApi } from "./types";

/** GET `/api/creator-portfolio/videos/me` — list authenticated creator portfolio videos */
export const portfolioMyVideosQueryKey = [
  "creator-portfolio",
  "videos",
  "me",
] as const;

export async function listMyPortfolioVideos(): Promise<PortfolioVideoApi[]> {
  const { data } = await api.get<PortfolioVideoApi[]>(
    ENDPOINTS.CREATOR_PORTFOLIO.VIDEOS_ME,
  );
  return data;
}
