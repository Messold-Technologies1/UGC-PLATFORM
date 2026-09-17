import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type CreateCheckoutPayload = {
  creatorId: string;
  packageId: string;
  addOnIds?: string[];
  /** Optional discount coupon code applied to this checkout. */
  couponCode?: string;
};

export type CheckoutSession = {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  razorpayKeyId: string;
  packageAmountPaise?: number;
  addOnsAmountPaise?: number;
  addOnsCount?: number;
  /** Pre-discount total (package + add-ons) in paise. */
  grossAmountPaise?: number;
  /** Coupon discount applied to the charge, in paise (0 when no coupon). */
  discountAmountPaise?: number;
  /** Applied coupon code, when a coupon reduced the charge. */
  couponCode?: string;
  /**
   * True when the net is ₹0 (e.g. a 100% coupon): the order is already placed
   * and no Razorpay payment is needed. The client skips the gateway.
   */
  free?: boolean;
};

export async function createCheckout(
  payload: CreateCheckoutPayload,
): Promise<CheckoutSession> {
  const { data } = await api.post<CheckoutSession>(ENDPOINTS.ORDERS.CHECKOUT, payload);
  return data;
}
