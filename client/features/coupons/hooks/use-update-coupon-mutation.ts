import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { updateCoupon } from "../api/update-coupon";
import { couponsQueryKey } from "./use-coupons-query";
import type { UpdateCouponInput } from "../types";

export function useUpdateCouponMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCouponInput }) =>
      updateCoupon(id, payload),
    onSuccess: () => {
      toast.success("Coupon updated successfully");
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(`Could not update coupon: ${err.response.data.message}`);
      } else {
        toast.error("An error occurred while updating this coupon");
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: couponsQueryKey });
    },
  });
}
