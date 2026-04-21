import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getOrderBrief, type OrderBriefResponse } from "../api/get-order-brief";

type UseGetOrderBriefQueryOptions = Omit<
  UseQueryOptions<OrderBriefResponse, Error>,
  "queryKey" | "queryFn"
>;

export function useGetOrderBriefQuery(
  orderId: string,
  options?: UseGetOrderBriefQueryOptions,
) {
  return useQuery({
    ...options,
    queryKey: ["orders", "brief", orderId],
    queryFn: () => getOrderBrief(orderId),
  });
}
