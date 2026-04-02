import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorProfileItemApi } from "./types";

export const creatorProfileMeQueryKey = ["creator-profile", "me"] as const;

export async function fetchCreatorProfileMe(): Promise<CreatorProfileItemApi> {
  const { data } = await api.get<CreatorProfileItemApi>(ENDPOINTS.CREATORS.PROFILE_ME);
  return data;
}

