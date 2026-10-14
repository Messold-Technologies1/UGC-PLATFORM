import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorProfileCompletenessApi } from "./types";

export const creatorProfileCompletenessQueryKey = [
  "creator-profile",
  "me",
  "completeness",
] as const;

export async function fetchCreatorProfileCompleteness(): Promise<CreatorProfileCompletenessApi> {
  const { data } = await api.get<CreatorProfileCompletenessApi>(
    ENDPOINTS.CREATORS.PROFILE_COMPLETENESS,
  );
  return data;
}
