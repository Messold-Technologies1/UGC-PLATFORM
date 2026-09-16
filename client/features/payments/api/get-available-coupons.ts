import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AvailableCoupon } from "@/features/payments/lib/coupon-discount";

/** Active coupons the current brand can apply, each flagged if already used. */
export async function getAvailableCoupons(): Promise<AvailableCoupon[]> {
  const { data } = await api.get<AvailableCoupon[]>(
    ENDPOINTS.COUPONS.AVAILABLE,
  );
  return data;
}
