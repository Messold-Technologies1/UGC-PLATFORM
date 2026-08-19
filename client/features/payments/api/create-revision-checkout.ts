import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CheckoutSession } from "./create-checkout";

/**
 * Start a Razorpay checkout to buy extra revisions on an order (once its
 * revision cap is reached). Returns the same session shape as regular checkout,
 * so the shared `openRazorpayCheckout` handles it unchanged.
 */
export async function createRevisionCheckout(
  orderId: string,
  /** Number of revision packs to buy in one payment (each = 2 revisions). */
  quantity = 1,
): Promise<CheckoutSession> {
  const { data } = await api.post<CheckoutSession>(
    ENDPOINTS.ORDERS.REVISION_CHECKOUT(orderId),
    { quantity },
  );
  return data;
}
