import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminOrderChatMessagesQueryDto,
  OrderChatMessagesResponseDto,
  OrderChatStateDto,
} from "../types";

export async function fetchAdminOrderChatMessages(
  orderId: string,
  query?: AdminOrderChatMessagesQueryDto,
): Promise<OrderChatMessagesResponseDto> {
  const { data } = await api.get<OrderChatMessagesResponseDto>(
    ENDPOINTS.ADMIN.ORDERS.CHAT_MESSAGES(orderId),
    { params: query },
  );
  return data;
}

export async function fetchAdminOrderChatState(
  orderId: string,
): Promise<OrderChatStateDto> {
  const { data } = await api.get<OrderChatStateDto>(
    ENDPOINTS.ADMIN.ORDERS.CHAT_STATE(orderId),
  );
  return data;
}
