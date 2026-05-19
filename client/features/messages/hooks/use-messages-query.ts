"use client";
import {
  MOCK_CONVERSATIONS,
  type MessageConversation,
} from "../mock/messages-mock-data";

export interface MessagesQueryResult {
  conversations: MessageConversation[];
  isLoading: boolean;
  error: null;
}

export function useMessagesQuery(): MessagesQueryResult {
  // TODO: replace with real useQuery when API is ready
  return { conversations: MOCK_CONVERSATIONS, isLoading: false, error: null };
}
