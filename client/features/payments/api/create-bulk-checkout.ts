import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type BulkCheckoutItem = {
  creatorId: string;
  /** Optional — the server resolves the creator's single package when omitted. */
  packageId?: string;
  addOnIds?: string[];
};

export type CreateBulkCheckoutPayload = {
  items: BulkCheckoutItem[];
  /** Optional coupon applied once to the whole cart (one payment). */
  couponCode?: string;
};

export type BulkCheckoutSkippedItem = {
  creatorId: string;
  packageId?: string;
  reason: string;
};

export type BulkCheckoutSession = {
  batchId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  razorpayKeyId: string;
  orderCount: number;
  orderIds: string[];
  skipped: BulkCheckoutSkippedItem[];
  /** Pre-discount cart total in paise. */
  grossAmountPaise?: number;
  /** Cart-level coupon discount applied to the charge, in paise. */
  discountAmountPaise?: number;
  /** Applied coupon code, when a coupon reduced the cart charge. */
  couponCode?: string;
};

export async function createBulkCheckout(
  payload: CreateBulkCheckoutPayload,
): Promise<BulkCheckoutSession> {
  const { data } = await api.post<BulkCheckoutSession>(
    ENDPOINTS.ORDERS.CHECKOUT_BULK,
    payload,
  );
  return data;
}
