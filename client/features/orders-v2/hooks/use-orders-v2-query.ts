"use client";

import { MOCK_ORDERS_V2, type OrderV2Item } from "../mock/orders-v2-mock-data";
import type { OrderV2Status, OrderV2Tab, TAB_STATUS_MAP } from "../constants";
import { TAB_STATUS_MAP as STATUS_MAP } from "../constants";

export interface OrdersV2QueryResult {
  orders: OrderV2Item[];
  total: number;
  counts: Record<string, number>;
  isLoading: boolean;
  error: null;
}

function computeCounts(orders: OrderV2Item[]) {
  const counts: Record<string, number> = { ALL: orders.length };
  for (const order of orders) {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
  }
  // Active = AWAITING_SHIPMENT + IN_PROGRESS
  counts["ACTIVE"] =
    (counts["AWAITING_SHIPMENT"] ?? 0) + (counts["IN_PROGRESS"] ?? 0);
  return counts;
}

export function useOrdersV2Query(tab: OrderV2Tab = "ALL"): OrdersV2QueryResult {
  // TODO: replace with real useQuery when API is ready
  const allowedStatuses = STATUS_MAP[tab] as OrderV2Status[];
  const filtered = MOCK_ORDERS_V2.filter((o) =>
    allowedStatuses.includes(o.status)
  );
  const counts = computeCounts(MOCK_ORDERS_V2);

  return {
    orders: filtered,
    total: MOCK_ORDERS_V2.length,
    counts,
    isLoading: false,
    error: null,
  };
}
