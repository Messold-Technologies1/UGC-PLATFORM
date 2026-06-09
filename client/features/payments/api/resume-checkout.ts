import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CheckoutSession } from "./create-checkout";

export async function resumeCheckout(orderId: string): Promise<CheckoutSession> {
  const { data } = await api.post<CheckoutSession>(
    ENDPOINTS.ORDERS.RESUME_CHECKOUT(orderId),
  );
  return data;
}
