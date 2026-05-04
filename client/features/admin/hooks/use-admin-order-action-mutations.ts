import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  markAdminOrderCreatorPaid,
  refundAdminOrder,
  rejectAdminOrder,
} from "../api/admin-order-actions";

function getErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;

  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;
  return fallback;
}

export function useMarkAdminOrderCreatorPaidMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "orders", "mark-creator-paid"],
    mutationFn: markAdminOrderCreatorPaid,
    onSuccess: async () => {
      toast.success("Creator marked as paid.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Unable to mark the creator as paid right now."),
      );
    },
  });
}

export function useRejectAdminOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "orders", "reject"],
    mutationFn: rejectAdminOrder,
    onSuccess: async () => {
      toast.success("Order marked as rejected for refund.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to reject this order."));
    },
  });
}

export function useRefundAdminOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "orders", "refund"],
    mutationFn: refundAdminOrder,
    onSuccess: async (data) => {
      toast.success("Razorpay refund triggered.", {
        description: `${data.refundId} (${data.refundStatus})`,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to trigger the refund."));
    },
  });
}
