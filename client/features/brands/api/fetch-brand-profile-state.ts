import { isAxiosError } from "axios";
import { fetchBrandProfileMe } from "./fetch-brand-profile-me";
import type { BrandProfileItemApi } from "./types";

export type BrandProfileState =
  | { kind: "ready"; profile: BrandProfileItemApi }
  | { kind: "missing" }
  | { kind: "revoked" };

export const brandProfileStateQueryKey = ["brand-profile", "state"] as const;

export async function fetchBrandProfileState(): Promise<BrandProfileState> {
  try {
    const profile = await fetchBrandProfileMe();
    return { kind: "ready", profile };
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 404) {
        return { kind: "missing" };
      }
      if (err.response?.status === 403) {
        return { kind: "revoked" };
      }
    }
    throw err;
  }
}
