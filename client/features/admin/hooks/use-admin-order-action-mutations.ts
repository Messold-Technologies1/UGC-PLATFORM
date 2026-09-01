import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  closeDisputeAdminOrder,
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

export function useCloseDisputeAdminOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "orders", "close-dispute"],
    mutationFn: closeDisputeAdminOrder,
    onSuccess: async () => {
      toast.success("Dispute closed without a refund.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to close this dispute."));
    },
  });
}

export function useRefundAdminOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "orders", "refund"],
    mutationFn: refundAdminOrder,
    onSuccess: async () => {
      toast.success("Order marked as refunded and the brand has been notified.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to trigger the refund."));
    },
  });
}
