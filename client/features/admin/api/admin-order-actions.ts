import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminOrderActionPayload,
  AdminOrderRefundResponseDto,
  AdminRejectOrderPayload,
  AdminResolveDisputePayload,
  OrderChatMessageDto,
  SendAdminOrderChatMessagePayload,
} from "../types";

export async function markAdminOrderCreatorPaid({
  orderId,
}: AdminOrderActionPayload): Promise<void> {
  await api.post(ENDPOINTS.ADMIN.ORDERS.MARK_CREATOR_PAID(orderId));
}

export async function rejectAdminOrder({
  orderId,
  resolutionNotes,
}: AdminRejectOrderPayload): Promise<void> {
  await api.post(ENDPOINTS.ADMIN.ORDERS.REJECT(orderId), {
    resolutionNotes,
  });
}

export async function refundAdminOrder({
  orderId,
}: AdminOrderActionPayload): Promise<AdminOrderRefundResponseDto> {
  const { data } = await api.post<AdminOrderRefundResponseDto>(
    ENDPOINTS.ADMIN.ORDERS.REFUND(orderId),
  );
  return data;
}

export async function closeDisputeAdminOrder({
  orderId,
  resolutionNotes,
}: AdminResolveDisputePayload): Promise<void> {
  await api.post(ENDPOINTS.ADMIN.ORDERS.CLOSE_DISPUTE(orderId), {
    resolutionNotes,
  });
}

export async function sendAdminOrderChatMessage({
  orderId,
  text,
  clientMessageId,
}: SendAdminOrderChatMessagePayload): Promise<OrderChatMessageDto> {
  const { data } = await api.post<OrderChatMessageDto>(
    ENDPOINTS.ADMIN.ORDERS.CHAT_MESSAGES(orderId),
    { text, clientMessageId },
  );
  return data;
}
