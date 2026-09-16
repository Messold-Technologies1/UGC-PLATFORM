import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { Coupon } from "../types";

export async function fetchCoupons(): Promise<Coupon[]> {
  const { data } = await api.get<Coupon[]>(ENDPOINTS.ADMIN.COUPONS.LIST);
  return data;
}
