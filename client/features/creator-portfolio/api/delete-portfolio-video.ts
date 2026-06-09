import api from "@/lib/api";
import { creatorPortfolioVideoPath } from "@/lib/endpoints";

import type { PortfolioApiRequestOptions } from "./types";

export async function deletePortfolioVideo(
  videoId: string,
  options?: PortfolioApiRequestOptions,
): Promise<void> {
  const url = new URL(creatorPortfolioVideoPath(videoId), window.location.origin);
  if (options?.adminCreatorId) {
    url.searchParams.set("creatorId", options.adminCreatorId);
  }
  
  await api.delete(url.pathname + url.search);
}
