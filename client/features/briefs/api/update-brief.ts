import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { Brief, CreateBriefPayload } from "./types";

export type UpdateBriefPayload = Partial<CreateBriefPayload>;

export async function updateBrief(id: string, payload: UpdateBriefPayload) {
  const { data } = await api.patch<Brief>(ENDPOINTS.BRIEFS.DETAIL(id), payload);
  return data;
}
