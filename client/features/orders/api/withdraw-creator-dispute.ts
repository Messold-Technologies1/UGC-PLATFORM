import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type WithdrawCreatorDisputePayload = {
  orderId: string;
};

export async function withdrawCreatorDispute({
  orderId,
}: WithdrawCreatorDisputePayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.CREATOR_DISPUTE_WITHDRAW(orderId));
}
