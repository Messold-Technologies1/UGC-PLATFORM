import { PLATFORM_FEE_RATE } from "@/features/creators/hooks/creator-profile-form-utils";

export type CouponDiscountType = "PERCENTAGE" | "FIXED" | "PLATFORM_FEE_WAIVER";

/** A coupon the current brand can apply at checkout (from GET /coupons/available). */
export type AvailableCoupon = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: CouponDiscountType;
  /** PERCENTAGE: whole percent. FIXED: paise. PLATFORM_FEE_WAIVER: unused. */
  discountValue: number;
  /** True when this brand has already used this coupon (cannot reuse). */
  alreadyUsed: boolean;
};

/**
 * Client-side preview of a coupon's discount, mirroring the server's authoritative
 * math (CouponsService.computeDiscountPaise). Purely for showing the brand the
 * expected total — the server recomputes and enforces it at checkout.
 * `grossPaise` is the pre-discount order total in paise.
 */
export function computeCouponDiscountPaise(
  discountType: CouponDiscountType,
  discountValue: number,
  grossPaise: number,
): number {
  const gross = Math.max(0, Math.round(grossPaise));
  let discount: number;
  switch (discountType) {
    case "PERCENTAGE":
      discount = Math.floor((gross * Math.min(100, Math.max(0, discountValue))) / 100);
      break;
    case "FIXED":
      discount = Math.max(0, Math.round(discountValue));
      break;
    case "PLATFORM_FEE_WAIVER":
      discount = Math.round(gross * PLATFORM_FEE_RATE);
      break;
    default:
      discount = 0;
  }
  return Math.min(gross, Math.max(0, discount));
}

/** Short human label, e.g. "20% off", "₹500 off", "No platform fee". */
export function couponShortLabel(coupon: AvailableCoupon): string {
  switch (coupon.discountType) {
    case "PERCENTAGE":
      return `${coupon.discountValue}% off`;
    case "FIXED":
      return `₹${Math.round(coupon.discountValue / 100).toLocaleString("en-IN")} off`;
    case "PLATFORM_FEE_WAIVER":
      return "No platform fee";
    default:
      return coupon.name;
  }
}
