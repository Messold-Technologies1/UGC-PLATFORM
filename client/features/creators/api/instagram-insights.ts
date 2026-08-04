import { env } from "@/lib/env";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { DemographicBucketApi } from "./social-connections";

export interface PublicInstagramInsightsApi {
  connected: boolean;
  username?: string;
  followers?: number;
  reach?: number;
  profileViews?: number;
  snapshotDate?: string;
  ageRanges: DemographicBucketApi[];
  gender: DemographicBucketApi[];
  topCities: DemographicBucketApi[];
  topCountries: DemographicBucketApi[];
}

export function instagramInsightsPath(creatorId: string): string {
  return `/api/social/creators/${encodeURIComponent(
    creatorId,
  )}/instagram/insights`;
}

export const publicInstagramInsightsQueryKey = (creatorId: string) =>
  ["social", "instagram", "insights", creatorId] as const;

/** Client-side fetch (browser, react-query) via the shared axios instance. */
export async function fetchPublicInstagramInsights(
  creatorId: string,
): Promise<PublicInstagramInsightsApi> {
  const { data } = await api.get<PublicInstagramInsightsApi>(
    instagramInsightsPath(creatorId),
  );
  return data;
}

/** Admin: force an immediate re-sync for a creator and return fresh insights. */
export async function refreshCreatorInstagramInsights(
  creatorProfileId: string,
): Promise<PublicInstagramInsightsApi> {
  const { data } = await api.post<PublicInstagramInsightsApi>(
    ENDPOINTS.SOCIAL.INSTAGRAM_REFRESH_CREATOR(creatorProfileId),
  );
  return data;
}

/** Creator: force an immediate re-sync of the current creator's own Instagram. */
export async function refreshMyInstagramInsights(): Promise<PublicInstagramInsightsApi> {
  const { data } = await api.post<PublicInstagramInsightsApi>(
    ENDPOINTS.SOCIAL.INSTAGRAM_REFRESH,
  );
  return data;
}

/** Server-side fetch (RSC) with forwarded cookies, mirroring other server fetchers. */
export async function fetchPublicInstagramInsightsServer(
  creatorId: string,
  cookieHeader?: string,
): Promise<PublicInstagramInsightsApi | null> {
  try {
    const res = await fetch(`${env.apiUrl}${instagramInsightsPath(creatorId)}`, {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicInstagramInsightsApi;
  } catch {
    return null;
  }
}
