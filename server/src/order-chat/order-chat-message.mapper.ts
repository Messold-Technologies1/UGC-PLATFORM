import type { OrderChatMessageType } from '@prisma/client';
import type { OrderChatMessageDto } from './dto/order-chat-message.dto';

export type OrderChatMessageRow = {
  id: string;
  orderId: string;
  senderUserId: string;
  type: OrderChatMessageType;
  text: string | null;
  audioKey: string | null;
  audioDurationMs: number | null;
  audioMimeType: string | null;
  clientMessageId: string | null;
  createdAt: Date;
};

export type FormattedOrderChatMessage = {
  id: string;
  orderId: string;
  senderUserId: string;
  type: OrderChatMessageType;
  text: string | null;
  audioUrl: string | null;
  audioDurationMs: number | null;
  audioMimeType: string | null;
  clientMessageId: string | null;
  createdAt: Date;
};

export function toOrderChatMessageDto(
  message: FormattedOrderChatMessage,
): OrderChatMessageDto {
  return {
    id: message.id,
    orderId: message.orderId,
    senderUserId: message.senderUserId,
    type: message.type,
    text: message.text,
    audioUrl: message.audioUrl,
    audioDurationMs: message.audioDurationMs,
    audioMimeType: message.audioMimeType,
    clientMessageId: message.clientMessageId,
    createdAt: message.createdAt.toISOString(),
  };
}

export function toRealtimeChatMessagePayload(
  message: FormattedOrderChatMessage,
): {
  id: string;
  orderId: string;
  senderUserId: string;
  type: OrderChatMessageType;
  text: string | null;
  audioUrl: string | null;
  audioDurationMs: number | null;
  audioMimeType: string | null;
  clientMessageId: string | null;
  createdAt: string;
} {
  return {
    id: message.id,
    orderId: message.orderId,
    senderUserId: message.senderUserId,
    type: message.type,
    text: message.text,
    audioUrl: message.audioUrl,
    audioDurationMs: message.audioDurationMs,
    audioMimeType: message.audioMimeType,
    clientMessageId: message.clientMessageId,
    createdAt: message.createdAt.toISOString(),
  };
}
