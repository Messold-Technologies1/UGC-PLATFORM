"use client";

import { Check, Tag } from "lucide-react";
import {
  couponShortLabel,
  type AvailableCoupon,
} from "@/features/payments/lib/coupon-discount";

interface CouponSelectorProps {
  coupons: AvailableCoupon[];
  isLoading?: boolean;
  /** Currently applied coupon code, or null. */
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
  /** Disable interaction (e.g. while a payment is in flight). */
  disabled?: boolean;
}

/**
 * Renders the brand's available coupons as selectable chips. Coupons the brand
 * has already used are shown disabled. Selecting a chip toggles it; the parent
 * applies the discount and passes the code into checkout.
 */
export function CouponSelector({
  coupons,
  isLoading = false,
  selectedCode,
  onSelect,
  disabled = false,
}: CouponSelectorProps) {
  if (isLoading) {
    return (
      <div className="text-xs font-medium text-muted-foreground">
        Loading offers…
      </div>
    );
  }
  if (coupons.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Tag className="size-3.5" /> Coupons
      </div>
      <div className="flex flex-wrap gap-2">
        {coupons.map((coupon) => {
          const isSelected = selectedCode === coupon.code;
          const isDisabled = disabled || coupon.alreadyUsed;
          return (
            <button
              key={coupon.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(isSelected ? null : coupon.code)}
              title={
                coupon.alreadyUsed
                  ? "You've already used this coupon"
                  : (coupon.description ?? coupon.name)
              }
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-white text-foreground hover:border-primary/60",
                coupon.alreadyUsed
                  ? "cursor-not-allowed opacity-50 line-through"
                  : "",
                disabled && !coupon.alreadyUsed ? "opacity-60" : "",
              ].join(" ")}
            >
              {isSelected ? <Check className="size-3.5" /> : null}
              {couponShortLabel(coupon)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
