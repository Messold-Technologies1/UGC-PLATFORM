export type DiscountType = "PERCENTAGE" | "FIXED" | "PLATFORM_FEE_WAIVER";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  /**
   * Meaning depends on discountType:
   * - PERCENTAGE: a whole percent, 1..100.
   * - FIXED: an amount in PAISE (e.g. 50000 = ₹500).
   * - PLATFORM_FEE_WAIVER: unused.
   */
  discountValue: number;
  active: boolean;
  redemptionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponInput {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  /** PERCENTAGE: whole percent 1..100. FIXED: amount in PAISE. Omitted for PLATFORM_FEE_WAIVER. */
  discountValue?: number;
  active?: boolean;
}

export type UpdateCouponInput = Partial<CreateCouponInput>;
