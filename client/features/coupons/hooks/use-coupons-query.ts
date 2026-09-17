import { useQuery } from "@tanstack/react-query";
import { fetchCoupons } from "../api/fetch-coupons";

export const couponsQueryKey = ["admin", "coupons"] as const;

export function useCouponsQuery(enabled = true) {
  return useQuery({
    queryKey: couponsQueryKey,
    queryFn: fetchCoupons,
    enabled,
  });
}
