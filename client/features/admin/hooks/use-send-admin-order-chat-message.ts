import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sendAdminOrderChatMessage } from "../api/admin-order-actions";
import { adminOrderChatMessagesQueryKey } from "./use-admin-order-chat";

function getErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;

  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;
  return fallback;
}

export function useSendAdminOrderChatMessageMutation(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "orders", orderId, "chat", "send"],
    mutationFn: (text: string) => sendAdminOrderChatMessage({ orderId, text }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminOrderChatMessagesQueryKey(orderId),
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to send the message."));
    },
  });
}
