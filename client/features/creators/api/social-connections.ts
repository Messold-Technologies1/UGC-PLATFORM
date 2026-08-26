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

export interface SocialConnectionApi {
  platform: SocialPlatformApi;
  status: SocialConnectionStatusApi;
  username?: string;
  accountType?: string;
  followersCount?: number;
  mediaCount?: number;
  reach30d?: number;
  views30d?: number;
  profileViews30d?: number;
  connectedAt?: string;
  lastSyncedAt?: string;
  lastSyncStatus?: string;
  audience?: SocialAudienceApi;
}

export const socialConnectionsQueryKey = ["social", "connections"] as const;

export async function fetchSocialConnections(): Promise<SocialConnectionApi[]> {
  const { data } = await api.get<{ connections: SocialConnectionApi[] }>(
    ENDPOINTS.SOCIAL.CONNECTIONS,
  );
  return data.connections ?? [];
}

/**
 * Authenticated (so tokens refresh) — returns the Instagram authorize URL.
 *
 * `returnTo` is where the OAuth callback should land afterwards; without it the
 * creator ends up on profile settings, which loses their place if they started
 * mid-wizard. The server only honours a same-site path.
 */
export async function getInstagramConnectUrl(
  returnTo?: string,
): Promise<string> {
  const { data } = await api.get<{ url: string }>(
    ENDPOINTS.SOCIAL.INSTAGRAM_CONNECT_URL,
    { params: returnTo ? { returnTo } : undefined },
  );
  return data.url;
}

export async function disconnectSocial(
  platform: SocialPlatformApi,
): Promise<void> {
  await api.delete(ENDPOINTS.SOCIAL.DISCONNECT(platform));
}
