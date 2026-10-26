import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CheckoutSession } from "./create-checkout";

/**
 * Start a Razorpay checkout to add the creator's "Travel within City" add-on to
 * an already-paid order — the brief asks for an on-location shoot the brand
 * didn't pay for at checkout. Returns the same session shape as regular
 * checkout, so the shared `openRazorpayCheckout` handles it unchanged.
 */
export async function createTravelAddOnCheckout(
  orderId: string,
): Promise<CheckoutSession> {
  const { data } = await api.post<CheckoutSession>(
    ENDPOINTS.ORDERS.TRAVEL_ADD_ON_CHECKOUT(orderId),
    {},
  );
  return data;
}
