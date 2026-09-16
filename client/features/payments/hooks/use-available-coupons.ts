"use client";

import { useQuery } from "@tanstack/react-query";
import { getAvailableCoupons } from "@/features/payments/api/get-available-coupons";

export const availableCouponsQueryKey = ["coupons", "available"] as const;

/**
 * Loads the active coupons the current brand can apply at checkout. `enabled`
 * lets callers defer the fetch until a checkout surface actually opens.
 */
export function useAvailableCoupons(enabled = true) {
  return useQuery({
    queryKey: availableCouponsQueryKey,
    queryFn: getAvailableCoupons,
    enabled,
    staleTime: 60_000,
  });
}
