import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  brandOrderDeliveriesQueryOptions,
  type BrandOrderDeliveriesResponse,
} from "../api/get-brand-order-deliveries";

type UseGetBrandOrderDeliveriesQueryOptions = Omit<
  UseQueryOptions<BrandOrderDeliveriesResponse, Error>,
  "queryKey" | "queryFn"
>;

export function useGetBrandOrderDeliveriesQuery(
  orderId: string,
  options?: UseGetBrandOrderDeliveriesQueryOptions,
) {
  return useQuery({
    ...brandOrderDeliveriesQueryOptions(orderId),
    ...options,
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}
