import { useQuery } from "@tanstack/react-query";

import { fetchFxRates } from "../api/fetch-fx-rates";

export const fxRatesQueryKey = ["fx", "rates"];

/**
 * Exchange rates for the pricing converter. Cached hard — they are published
 * once a day and the server caches them again behind this.
 */
export function useFxRatesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: fxRatesQueryKey,
    queryFn: fetchFxRates,
    enabled: options?.enabled ?? true,
    staleTime: 60 * 60_000,
    // A creator with no rates gets the rupee field, not a broken form, so a
    // failure here is not worth hammering.
    retry: 1,
  });
}
