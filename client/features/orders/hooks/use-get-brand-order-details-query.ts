import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  brandOrderDetailsQueryOptions,
  type BrandOrderDetailsResponse,
} from "../api/get-brand-order-details";

type UseGetBrandOrderDetailsQueryOptions = Omit<
  UseQueryOptions<BrandOrderDetailsResponse, Error>,
  "queryKey" | "queryFn"
>;

export function useGetBrandOrderDetailsQuery(
  orderId: string,
  options?: UseGetBrandOrderDetailsQueryOptions,
) {
  return useQuery({
    ...brandOrderDetailsQueryOptions(orderId),
    ...options,
    enabled: Boolean(orderId) && (options?.enabled ?? true),
    refetchOnMount: options?.refetchOnMount ?? "always",
  });
}
