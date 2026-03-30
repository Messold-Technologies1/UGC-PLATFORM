import api from "@/lib/api";
import { creatorPortfolioVideoPath } from "@/lib/endpoints";

export async function deletePortfolioVideo(videoId: string): Promise<void> {
  await api.delete(creatorPortfolioVideoPath(videoId));
}
