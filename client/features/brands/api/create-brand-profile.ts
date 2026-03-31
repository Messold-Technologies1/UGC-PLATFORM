import { isAxiosError } from "axios";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { BrandProfileItemApi } from "./types";

export type CreateBrandProfilePayload = {
  companyName: string;
  logoKey?: string;
  website?: string;
  industry?: string;
  contactPerson?: string;
};

export async function createBrandProfile(
  payload: CreateBrandProfilePayload,
): Promise<BrandProfileItemApi> {
  const { data } = await api.post<BrandProfileItemApi>(
    ENDPOINTS.BRANDS.PROFILE,
    payload,
  );
  return data;
}

export async function ensureBrandProfile(
  payload: CreateBrandProfilePayload,
): Promise<{ created: boolean; profile?: BrandProfileItemApi }> {
  try {
    const profile = await createBrandProfile(payload);
    return { created: true, profile };
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 409) {
      return { created: false };
    }
    throw err;
  }
}

