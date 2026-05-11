import { useQuery } from "@tanstack/react-query";
import { fetchAdminOrderDetails } from "../api/fetch-admin-order-details";

export const adminOrderDetailsQueryKey = (orderId: string) =>
  ["admin", "orders", orderId] as const;

export function useAdminOrderDetailsQuery(orderId: string) {
  return useQuery({
    queryKey: adminOrderDetailsQueryKey(orderId),
    queryFn: () => fetchAdminOrderDetails(orderId),
    enabled: Boolean(orderId),
  });
}
