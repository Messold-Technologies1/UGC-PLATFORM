import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  getCreatorOrders,
  type CreatorOrdersListResponse,
  type GetCreatorOrdersParams,
} from "../api/get-creator-orders";

type UseGetCreatorOrdersQueryOptions = Omit<
  UseQueryOptions<CreatorOrdersListResponse, Error>,
  "queryKey" | "queryFn"
>;

export function useGetCreatorOrdersQuery(
  params?: GetCreatorOrdersParams,
  options?: UseGetCreatorOrdersQueryOptions,
) {
  return useQuery({
    ...options,
    queryKey: ["orders", "creator", params],
    queryFn: () => getCreatorOrders(params),
  });
}
