import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { DemoVideoApi } from "../types";

/** Active examples for the wizard "watch a few examples" gallery. */
export async function fetchDemoIntroVideos(): Promise<DemoVideoApi[]> {
  const { data } = await api.get<DemoVideoApi[]>(
    ENDPOINTS.CREATORS.DEMO_INTRO_VIDEOS,
  );
  return data;
}
