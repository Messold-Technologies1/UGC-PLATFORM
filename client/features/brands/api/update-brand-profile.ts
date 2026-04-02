import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { BrandProfileItemApi } from "./types";

export type UpdateBrandProfilePayload = {
  companyName?: string;
  logoKey?: string | null;
  website?: string | null;
  industry?: string | null;
  contactPerson?: string | null;
};

export async function updateBrandProfile(
  payload: UpdateBrandProfilePayload,
): Promise<BrandProfileItemApi> {
  const { data } = await api.patch<BrandProfileItemApi>(
    ENDPOINTS.BRANDS.PROFILE,
    payload,
  );
  return data;
}

