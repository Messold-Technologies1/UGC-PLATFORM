import api from "@/lib/api";
import { creatorPortfolioVideoPath } from "@/lib/endpoints";
import type { PortfolioVideoApi } from "./types";

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
): Promise<PortfolioVideoApi> {
  const { data } = await api.patch<PortfolioVideoApi>(
    creatorPortfolioVideoPath(videoId),
    payload,
  );
  return data;
}
