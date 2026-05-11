import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface OrderChatMessageDto {
  id: string;
  orderId: string;
  senderUserId: string;
  text: string;
  clientMessageId?: string | null;
  createdAt: string;
  deliveryStatus?: "sending" | "failed";
}

export interface OrderChatMessagesResponseDto {
  items: OrderChatMessageDto[];
  nextCursor?: string;
}

export interface OrderChatStateDto {
  orderId: string;
  brandUserId: string;
  creatorUserId: string;
  brandLastReadMessageId?: string;
  brandLastReadAt?: string;
  creatorLastReadMessageId?: string;
  creatorLastReadAt?: string;
}

export interface OrderChatReadReceiptDto {
  orderId: string;
  userId: string;
  lastReadMessageId?: string | null;
  lastReadAt?: string | null;
}

export interface OrderChatMessagesQueryDto {
  limit?: number;
  cursor?: string;
  after?: string;
}

export interface SendOrderChatMessagePayload {
  text: string;
  clientMessageId?: string;
}

export interface MarkOrderChatReadPayload {
  lastReadMessageId: string;
}

export async function fetchOrderChatMessages(
  orderId: string,
  query?: OrderChatMessagesQueryDto,
): Promise<OrderChatMessagesResponseDto> {
  const { data } = await api.get<OrderChatMessagesResponseDto>(
    ENDPOINTS.ORDERS.CHAT_MESSAGES(orderId),
    { params: query },
  );
  return data;
}

export async function sendOrderChatMessage(
  orderId: string,
  payload: SendOrderChatMessagePayload,
): Promise<OrderChatMessageDto> {
  const { data } = await api.post<OrderChatMessageDto>(
    ENDPOINTS.ORDERS.CHAT_MESSAGES(orderId),
    payload,
  );
  return data;
}

export async function markOrderChatRead(
  orderId: string,
  payload: MarkOrderChatReadPayload,
): Promise<OrderChatReadReceiptDto> {
  const { data } = await api.post<OrderChatReadReceiptDto>(
    ENDPOINTS.ORDERS.CHAT_READ(orderId),
    payload,
  );
  return data;
}

export async function fetchOrderChatState(
  orderId: string,
): Promise<OrderChatStateDto> {
  const { data } = await api.get<OrderChatStateDto>(
    ENDPOINTS.ORDERS.CHAT_STATE(orderId),
  );
  return data;
}
