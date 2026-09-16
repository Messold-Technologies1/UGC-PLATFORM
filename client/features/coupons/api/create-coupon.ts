import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { Coupon, CreateCouponInput } from "../types";

export async function createCoupon(payload: CreateCouponInput): Promise<Coupon> {
  const { data } = await api.post<Coupon>(
    ENDPOINTS.ADMIN.COUPONS.CREATE,
    payload,
  );
  return data;
}
