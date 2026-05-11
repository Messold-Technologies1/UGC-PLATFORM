import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { ListBriefsResponse } from "./types";

export async function listBriefs() {
  const { data } = await api.get<ListBriefsResponse>(ENDPOINTS.BRIEFS.LIST);
  return data;
}
