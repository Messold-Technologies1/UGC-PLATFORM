import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  ImportInstagramReelsResponse,
  InstagramMediaPageApi,
  InstagramMediaSyncStatusApi,
} from "./types";

export const instagramReelsQueryKey = ["instagram", "reels"] as const;
export const instagramReelsStatusQueryKey = [
  "instagram",
  "reels",
  "status",
] as const;

export async function fetchInstagramReels(params: {
  cursor?: string | null;
  limit?: number;
}): Promise<InstagramMediaPageApi> {
  const { data } = await api.get<InstagramMediaPageApi>(
    ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA,
    {
      params: {
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
      },
    },
  );
  return data;
}

export async function fetchInstagramReelsStatus(): Promise<InstagramMediaSyncStatusApi> {
  const { data } = await api.get<InstagramMediaSyncStatusApi>(
    ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA_STATUS,
  );
  return data;
}

export async function refreshInstagramReels(): Promise<InstagramMediaSyncStatusApi> {
  const { data } = await api.post<InstagramMediaSyncStatusApi>(
    ENDPOINTS.SOCIAL.INSTAGRAM_MEDIA_REFRESH,
  );
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
