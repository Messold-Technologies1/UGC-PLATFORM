import "server-only";

import { env } from "@/lib/env";
import { creatorPortfolioPublicVideosPath } from "@/lib/endpoints";
import type { PortfolioVideoApi } from "./types";

export async function fetchPublicPortfolioVideosByCreatorIdServer(
  creatorId: string,
): Promise<PortfolioVideoApi[]> {
  try {
    const res = await fetch(
      `${env.apiUrl}${creatorPortfolioPublicVideosPath(creatorId)}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) {
      return [];
    }

    return (await res.json()) as PortfolioVideoApi[];
  } catch {
    return [];
  }
}
