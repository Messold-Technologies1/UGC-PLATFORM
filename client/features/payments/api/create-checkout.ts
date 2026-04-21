import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type CreateCheckoutPayload = {
  creatorId: string;
  packageId: string;
  addOnIds?: string[];
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
};

export async function createCheckout(
  payload: CreateCheckoutPayload,
): Promise<CheckoutSession> {
  const { data } = await api.post<CheckoutSession>(ENDPOINTS.ORDERS.CHECKOUT, payload);
  return data;
}
