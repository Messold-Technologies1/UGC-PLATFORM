import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface OrderRevisionItem {
  id: string;
  revisionNumber: number;
  note: string | null;
  requestedAt: string;
}

export interface OrderRevisionsResponse {
  items: OrderRevisionItem[];
}

export function orderRevisionsQueryKey(orderId: string) {
  return ["orders", orderId, "revisions"] as const;
}

export async function getOrderRevisions(orderId: string) {
  const { data } = await api.get<OrderRevisionsResponse>(
    ENDPOINTS.ORDERS.REVISIONS(orderId),
  );
  return data;
}

export function orderRevisionsQueryOptions(orderId: string) {
  return {
    queryKey: orderRevisionsQueryKey(orderId),
    queryFn: () => getOrderRevisions(orderId),
  };
}
