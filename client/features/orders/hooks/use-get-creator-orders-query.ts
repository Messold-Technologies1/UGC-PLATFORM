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
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  return useQuery({
    ...options,
    queryKey: ["orders", "creator", page, limit],
    queryFn: () => getCreatorOrders({ page, limit }),
  });
}
