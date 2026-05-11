import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreateBriefPayload, CreateBriefResponse } from "./types";

export async function createBrief(payload: CreateBriefPayload) {
  const { data } = await api.post<CreateBriefResponse>(
    ENDPOINTS.BRIEFS.LIST,
    payload,
  );
  return data;
}
