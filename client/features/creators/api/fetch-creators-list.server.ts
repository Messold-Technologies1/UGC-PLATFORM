import "server-only";

import { env } from "@/lib/env";
import { ENDPOINTS } from "@/lib/endpoints";
import { mapProfileToListingCreator } from "./map-profile-to-creator";
import type { CreatorsListResponse } from "./types";
import type { CreatorsListResult } from "../hooks/use-creators-list-query";

export async function fetchCreatorsListServer({
  page = 1,
  limit = 20,
  includeCookies = false,
  revalidate = 60,
}: {
  page?: number;
  limit?: number;
  includeCookies?: boolean;
  revalidate?: number | false;
} = {}): Promise<CreatorsListResult | null> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    let cookieHeader = "";
    if (includeCookies) {
      const { cookies } = await import("next/headers");
      cookieHeader = (await cookies())
        .getAll()
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
    }

    const res = await fetch(`${env.apiUrl}${ENDPOINTS.CREATORS.LIST}?${params}`, {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      ...(revalidate === false
        ? { cache: "no-store" as const }
        : { next: { revalidate } }),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as CreatorsListResponse;
    return {
      creators: data.items.map(mapProfileToListingCreator),
      total: data.total,
      page: data.page,
      limit: data.limit,
    };
  } catch {
    return null;
  }
}
