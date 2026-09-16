import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { Coupon, UpdateCouponInput } from "../types";

export async function updateCoupon(
  id: string,
  payload: UpdateCouponInput,
): Promise<Coupon> {
  const { data } = await api.patch<Coupon>(
    ENDPOINTS.ADMIN.COUPONS.UPDATE(id),
    payload,
  );
  return data;
}
