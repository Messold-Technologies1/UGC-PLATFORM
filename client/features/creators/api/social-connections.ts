import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type SocialPlatformApi = "INSTAGRAM" | "YOUTUBE" | "REDDIT";
export type SocialConnectionStatusApi =
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED"
  | "ERROR";

export interface DemographicBucketApi {
  key: string;
  value: number;
  share?: number;
}

export interface SocialAudienceApi {
  snapshotDate?: string;
  followerCount?: number;
  ageRanges: DemographicBucketApi[];
  gender: DemographicBucketApi[];
  topCities: DemographicBucketApi[];
  topCountries: DemographicBucketApi[];
}

export interface SocialMetricPointApi {
  date: string;
  reach?: number;
  views?: number;
  followerCount?: number;
  profileViews?: number;
}

export interface SocialConnectionApi {
  platform: SocialPlatformApi;
  status: SocialConnectionStatusApi;
  username?: string;
  accountType?: string;
  followersCount?: number;
  mediaCount?: number;
  connectedAt?: string;
  lastSyncedAt?: string;
  lastSyncStatus?: string;
  metrics?: SocialMetricPointApi[];
  audience?: SocialAudienceApi;
}

export const socialConnectionsQueryKey = ["social", "connections"] as const;

export async function fetchSocialConnections(): Promise<SocialConnectionApi[]> {
  const { data } = await api.get<{ connections: SocialConnectionApi[] }>(
    ENDPOINTS.SOCIAL.CONNECTIONS,
  );
  return data.connections ?? [];
}

/** Authenticated (so tokens refresh) — returns the Instagram authorize URL. */
export async function getInstagramConnectUrl(): Promise<string> {
  const { data } = await api.get<{ url: string }>(
    ENDPOINTS.SOCIAL.INSTAGRAM_CONNECT_URL,
  );
  return data.url;
}

export async function disconnectSocial(
  platform: SocialPlatformApi,
): Promise<void> {
  await api.delete(ENDPOINTS.SOCIAL.DISCONNECT(platform));
}
