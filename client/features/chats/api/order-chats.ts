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
  brandName: string;
  logoUrl?: string | null;
}

export interface ChatCreatorCounterpartyDto {
  id: string;
  displayName: string;
  introVideoUrl?: string | null;
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
