import api from "@/lib/api";
import { creatorPortfolioPublicVideosPath } from "@/lib/endpoints";
import type { PortfolioVideoApi } from "./types";

export function publicPortfolioVideosByCreatorQueryKey(creatorId: string) {
  return ["creator-portfolio", "public-videos", creatorId] as const;
}


export async function fetchPublicPortfolioVideosByCreatorId(
  creatorId: string,
): Promise<PortfolioVideoApi[]> {
  const { data } = await api.get<PortfolioVideoApi[]>(
    creatorPortfolioPublicVideosPath(creatorId),
  );
  return data;
}
