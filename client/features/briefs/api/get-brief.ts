import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { Brief } from "./types";

export async function getBrief(id: string) {
  const { data } = await api.get<Brief>(ENDPOINTS.BRIEFS.DETAIL(id));
  return data;
}
