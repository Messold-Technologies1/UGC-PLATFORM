import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type ChatMessageType = "TEXT" | "VOICE";

export interface ChatLastMessageDto {
  id: string;
  senderUserId: string;
  type: ChatMessageType;
  previewText?: string | null;
  createdAt: string;
}

export interface ChatBrandCounterpartyDto {
  id: string;
  brandName: string | null;
  logoUrl?: string | null;
}

export interface ChatCreatorCounterpartyDto {
  id: string;
  displayName: string;
  introVideoUrl?: string | null;
  profileImageUrl?: string | null;
  city?: string | null;
}

export interface CreatorChatListItemDto {
  orderId: string;
  status: string;
  packageName: string;
  isChatLocked: boolean;
  brand: ChatBrandCounterpartyDto;
  lastMessage?: ChatLastMessageDto;
  unreadCount: number;
  updatedAt: string;
}

export interface BrandChatListItemDto {
  orderId: string;
  status: string;
  packageName: string;
  isChatLocked: boolean;
  creator: ChatCreatorCounterpartyDto;
  lastMessage?: ChatLastMessageDto;
  unreadCount: number;
  updatedAt: string;
}

export interface CreatorChatsListResponseDto {
  items: CreatorChatListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface BrandChatsListResponseDto {
  items: BrandChatListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface ListChatsParams {
  page?: number;
  limit?: number;
}

/** Preview line for the messages inbox (uses API denormalized lastMessage). */
export function formatChatInboxPreview(
  lastMessage: ChatLastMessageDto | undefined,
  options?: { viewerUserId?: string; emptyLabel?: string },
): string {
  const emptyLabel = options?.emptyLabel ?? "No messages yet";

  if (!lastMessage) return emptyLabel;

  const body =
    lastMessage.previewText?.trim() ||
    (lastMessage.type === "VOICE" ? "Voice message" : "");

  if (!body) return emptyLabel;

  if (
    options?.viewerUserId &&
    lastMessage.senderUserId === options.viewerUserId
  ) {
    return `You: ${body}`;
  }

  return body;
}

export async function fetchCreatorChats(
  params?: ListChatsParams,
): Promise<CreatorChatsListResponseDto> {
  const { data } = await api.get<CreatorChatsListResponseDto>(
    ENDPOINTS.CHATS.CREATOR,
    { params },
  );
  return data;
}

export async function fetchBrandChats(
  params?: ListChatsParams,
): Promise<BrandChatsListResponseDto> {
  const { data } = await api.get<BrandChatsListResponseDto>(
    ENDPOINTS.CHATS.BRAND,
    { params },
  );
  return data;
}
