import { useQuery } from "@tanstack/react-query";
import { orderRevisionsQueryOptions } from "../api/get-order-revisions";

export function useGetOrderRevisionsQuery(orderId: string) {
  return useQuery({
    ...orderRevisionsQueryOptions(orderId),
    enabled: !!orderId,
  });
}
