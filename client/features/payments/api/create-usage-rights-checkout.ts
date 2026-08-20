import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CheckoutSession } from "./create-checkout";

/**
 * Start a Razorpay checkout to buy extra usage-rights time on a completed order
 * (non-refundable 30-day blocks). Returns the same session shape as regular
 * checkout, so the shared `openRazorpayCheckout` handles it unchanged.
 */
export async function createUsageRightsCheckout(
  orderId: string,
  /** Number of 30-day usage-rights blocks to buy in one payment. */
  quantity = 1,
): Promise<CheckoutSession> {
  const { data } = await api.post<CheckoutSession>(
    ENDPOINTS.ORDERS.USAGE_RIGHTS_CHECKOUT(orderId),
    { quantity },
  );
  return data;
}
