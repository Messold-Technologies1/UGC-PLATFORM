import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { OrderDeliveryItem } from "@/features/orders/api/get-brand-order-deliveries";

export interface AdminOrderDeliveriesResponse {
  items: OrderDeliveryItem[];
}

export function adminOrderDeliveriesQueryKey(orderId: string) {
  return ["admin", "orders", orderId, "deliveries"] as const;
}

export async function getAdminOrderDeliveries(orderId: string) {
  const { data } = await api.get<AdminOrderDeliveriesResponse>(
    ENDPOINTS.ADMIN.ORDERS.DELIVERIES(orderId),
  );
  return data;
}

export function useAdminOrderDeliveriesQuery(orderId: string) {
  return useQuery({
    queryKey: adminOrderDeliveriesQueryKey(orderId),
    queryFn: () => getAdminOrderDeliveries(orderId),
    enabled: Boolean(orderId),
    staleTime: 60_000,
  });
}
