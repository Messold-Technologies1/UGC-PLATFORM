import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreateDemoVideoInput, DemoVideoApi, UpdateDemoVideoInput } from "../types";

export type PresignDemoVideoUploadPayload = {
  kind: "video" | "thumbnail";
  contentType: string;
  contentLength?: number;
};

export type PresignDemoVideoUploadResponse = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export async function fetchAdminDemoVideos(): Promise<DemoVideoApi[]> {
  const { data } = await api.get<DemoVideoApi[]>(
    ENDPOINTS.ADMIN.DEMO_INTRO_VIDEOS.LIST,
  );
  return data;
}

export async function presignDemoVideoUpload(
  payload: PresignDemoVideoUploadPayload,
): Promise<PresignDemoVideoUploadResponse> {
  const { data } = await api.post<PresignDemoVideoUploadResponse>(
    ENDPOINTS.ADMIN.DEMO_INTRO_VIDEOS.UPLOADS_PRESIGN,
    payload,
  );
  return data;
}

export async function putToPresignedUrl(
  file: File,
  presign: PresignDemoVideoUploadResponse,
): Promise<void> {
  const res = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: presign.headers,
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
}

export async function createDemoVideo(
  payload: CreateDemoVideoInput,
): Promise<DemoVideoApi> {
  const { data } = await api.post<DemoVideoApi>(
    ENDPOINTS.ADMIN.DEMO_INTRO_VIDEOS.CREATE,
    payload,
  );
  return data;
}

export async function updateDemoVideo(
  id: string,
  payload: UpdateDemoVideoInput,
): Promise<DemoVideoApi> {
  const { data } = await api.patch<DemoVideoApi>(
    ENDPOINTS.ADMIN.DEMO_INTRO_VIDEOS.BY_ID(id),
    payload,
  );
  return data;
}

export async function deleteDemoVideo(id: string): Promise<void> {
  await api.delete(ENDPOINTS.ADMIN.DEMO_INTRO_VIDEOS.BY_ID(id));
}
