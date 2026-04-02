import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { BrandProfileItemApi } from "./types";

export const brandProfileMeQueryKey = ["brand-profile", "me"] as const;

export async function fetchBrandProfileMe(): Promise<BrandProfileItemApi> {
  const { data } = await api.get<BrandProfileItemApi>(
    ENDPOINTS.BRANDS.PROFILE_ME,
  );
  return data;
}

