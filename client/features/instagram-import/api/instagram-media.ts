import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  ImportInstagramReelsResponse,
  InstagramMediaPageApi,
  InstagramMediaSyncStatusApi,
} from "./types";

/**
 * An admin browsing on a creator's behalf reads the same cache through
 * admin-guarded routes. The query key carries the creator id so one admin
 * session can hold several creators' galleries without them colliding.
 */
/**
 * Prefix shared by every reel query — the gallery pages and the status read, for
 * both the creator's own view and an admin's. One invalidate against this
 * refreshes whichever is mounted, which is what the realtime handler needs.
 */
export const instagramReelsBaseQueryKey = ["instagram", "reels"] as const;

export function instagramReelsQueryKeyFor(adminCreatorId?: string) {
  return adminCreatorId
    ? (["instagram", "reels", adminCreatorId] as const)
    : (["instagram", "reels"] as const);
}

export function instagramReelsStatusQueryKeyFor(adminCreatorId?: string) {
  return adminCreatorId
    ? (["instagram", "reels", "status", adminCreatorId] as const)
    : (["instagram", "reels", "status"] as const);
}

export const instagramReelsQueryKey = instagramReelsQueryKeyFor();
export const instagramReelsStatusQueryKey = instagramReelsStatusQueryKeyFor();

export async function fetchInstagramReels(params: {
  cursor?: string | null;
  limit?: number;
  adminCreatorId?: string;
}): Promise<InstagramMediaPageApi> {
  const url = params.adminCreatorId
    ? ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA_FOR_CREATOR(params.adminCreatorId)
    : ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA;
  const { data } = await api.get<InstagramMediaPageApi>(url, {
    params: {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
    },
  });
  return data;
}

export async function fetchInstagramReelsStatus(
  adminCreatorId?: string,
): Promise<InstagramMediaSyncStatusApi> {
  const url = adminCreatorId
    ? ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA_STATUS_FOR_CREATOR(adminCreatorId)
    : ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA_STATUS;
  const { data } = await api.get<InstagramMediaSyncStatusApi>(url);
  return data;
}

export async function refreshInstagramReels(
  adminCreatorId?: string,
): Promise<InstagramMediaSyncStatusApi> {
  const url = adminCreatorId
    ? ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA_REFRESH_FOR_CREATOR(adminCreatorId)
    : ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA_REFRESH;
  const { data } = await api.post<InstagramMediaSyncStatusApi>(url);
  return data;
}

/**
 * Fetch the next batch of older reels from Instagram.
 *
 * Only called once the reader has reached the end of the cache — paging within
 * the cache is free, and this is the one call that spends a Graph request. The
 * server resumes from its stored cursor, so this continues past the last cached
 * reel rather than re-reading the account from the top.
 */
export async function loadMoreInstagramReels(
  adminCreatorId?: string,
): Promise<InstagramMediaSyncStatusApi> {
  const url = adminCreatorId
    ? ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA_LOAD_MORE_FOR_CREATOR(adminCreatorId)
    : ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA_LOAD_MORE;
  const { data } = await api.post<InstagramMediaSyncStatusApi>(url);
  return data;
}

export async function importInstagramReels(
  igMediaIds: string[],
  options?: { adminCreatorId?: string },
): Promise<ImportInstagramReelsResponse> {
  const { data } = await api.post<ImportInstagramReelsResponse>(
    ENDPOINTS.CREATOR_PORTFOLIO.VIDEOS_IMPORT_INSTAGRAM,
    {
      igMediaIds,
      ...(options?.adminCreatorId ? { creatorId: options.adminCreatorId } : {}),
    },
  );
  return data;
}
