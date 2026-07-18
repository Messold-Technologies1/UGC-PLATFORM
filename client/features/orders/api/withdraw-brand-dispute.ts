import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type WithdrawBrandDisputePayload = {
  orderId: string;
};

export async function withdrawBrandDispute({
  orderId,
}: WithdrawBrandDisputePayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.BRAND_DISPUTE_WITHDRAW(orderId));
}
