import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type CreateCheckoutPayload = {
  creatorId: string;
  packageId: string;
};

export type CheckoutSession = {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  razorpayKeyId: string;
};

export async function createCheckout(
  payload: CreateCheckoutPayload,
): Promise<CheckoutSession> {
  const { data } = await api.post<CheckoutSession>(ENDPOINTS.ORDERS.CHECKOUT, payload);
  return data;
}
