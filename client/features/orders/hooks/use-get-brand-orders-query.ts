import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  getBrandOrders,
  type BrandOrdersListResponse,
  type GetBrandOrdersParams,
} from "../api/get-brand-orders";

type UseGetBrandOrdersQueryOptions = Omit<
  UseQueryOptions<BrandOrdersListResponse, Error>,
  "queryKey" | "queryFn"
>;

export function useGetBrandOrdersQuery(
  params?: GetBrandOrdersParams,
  options?: UseGetBrandOrdersQueryOptions,
) {
  return useQuery({
    ...options,
    queryKey: ["orders", "brand", params],
    queryFn: () => getBrandOrders(params),
    staleTime: options?.staleTime ?? 30_000,
  });
}
