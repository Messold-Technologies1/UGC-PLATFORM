import { useQuery } from "@tanstack/react-query";
import { fetchAdminOrders } from "../api/fetch-admin-orders";
import type { AdminOrdersQueryDto } from "../types";

export const adminOrdersQueryKey = (query?: AdminOrdersQueryDto) => [
  "admin",
  "orders",
  query,
] as const;

export function useAdminOrdersQuery(query?: AdminOrdersQueryDto) {
  return useQuery({
    queryKey: adminOrdersQueryKey(query),
    queryFn: () => fetchAdminOrders(query),
  });
}
