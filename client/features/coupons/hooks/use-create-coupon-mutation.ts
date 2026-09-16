import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { createCoupon } from "../api/create-coupon";
import { couponsQueryKey } from "./use-coupons-query";

export function useCreateCouponMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      toast.success("Coupon created successfully");
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(`Could not create coupon: ${err.response.data.message}`);
      } else {
        toast.error("An error occurred while creating this coupon");
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: couponsQueryKey });
    },
  });
}
