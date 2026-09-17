import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { deleteCoupon } from "../api/delete-coupon";
import { couponsQueryKey } from "./use-coupons-query";

export function useDeleteCouponMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      toast.success("Coupon deleted successfully");
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(`Could not delete coupon: ${err.response.data.message}`);
      } else {
        toast.error("An error occurred while deleting this coupon");
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: couponsQueryKey });
    },
  });
}
