import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface FxRatesResponse {
  /** False when rates are unavailable; the form asks for rupees instead. */
  available: boolean;
  base: string;
  date: string;
  /** True when the upstream failed and these came from cache. */
  stale: boolean;
  /** Units of each currency per 1 INR. */
  rates: Record<string, number>;
}

export async function fetchFxRates(): Promise<FxRatesResponse> {
  const { data } = await api.get<FxRatesResponse>(ENDPOINTS.FX.RATES);
  return data;
}
