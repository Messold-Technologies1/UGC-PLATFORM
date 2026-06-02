import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export const ORDER_CHAT_VOICE_MAX_BYTES = 10 * 1024 * 1024;
export const ORDER_CHAT_VOICE_MAX_DURATION_MS = 5 * 60 * 1000;

export type OrderChatMessageType = "TEXT" | "VOICE";

export interface OrderChatMessageDto {
  id: string;
  orderId: string;
  senderUserId: string;
  type: OrderChatMessageType;
  text?: string | null;
  audioUrl?: string | null;
  audioDurationMs?: number | null;
  audioMimeType?: string | null;
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

export interface PresignOrderChatVoiceUploadPayload {
  contentType: string;
  contentLength?: number;
}

export interface PresignOrderChatVoiceUploadResponse {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
}

export interface SendOrderChatVoiceMessagePayload {
  audioKey: string;
  audioDurationMs: number;
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
    ENDPOINTS.CHATS.MESSAGES(orderId),
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

export async function presignOrderChatVoiceUpload(
  orderId: string,
  payload: PresignOrderChatVoiceUploadPayload,
): Promise<PresignOrderChatVoiceUploadResponse> {
  const { data } = await api.post<PresignOrderChatVoiceUploadResponse>(
    ENDPOINTS.ORDERS.CHAT_MESSAGES_VOICE_PRESIGN(orderId),
    payload,
  );
  return data;
}

export async function putOrderChatVoiceToPresignedUrl(
  blob: Blob,
  presign: PresignOrderChatVoiceUploadResponse,
): Promise<void> {
  const res = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: presign.headers,
    body: blob,
  });

  if (!res.ok) {
    throw new Error(`Voice upload failed (${res.status})`);
  }
}

export async function sendOrderChatVoiceMessage(
  orderId: string,
  payload: SendOrderChatVoiceMessagePayload,
): Promise<OrderChatMessageDto> {
  const { data } = await api.post<OrderChatMessageDto>(
    ENDPOINTS.ORDERS.CHAT_MESSAGES_VOICE(orderId),
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
