"use client";

import { useMemo, useState } from "react";
import { Check, Lock, TicketPercent, X } from "lucide-react";
import {
  computeCouponDiscountPaise,
  couponShortLabel,
  type AvailableCoupon,
} from "@/features/payments/lib/coupon-discount";

interface CouponInputProps {
  /** Active coupons for this brand — used only to validate the typed code. */
  coupons: AvailableCoupon[];
  isLoading?: boolean;
  /** Currently applied coupon code, or null. */
  appliedCode: string | null;
  /** Rupee value of the applied discount. */
  discountRupees: number;
  /** Pre-discount order total in paise, for per-coupon savings previews. */
  grossPaise: number;
  onApply: (code: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/**
 * Minimal coupon entry: paste a code and hit Apply. If it matches one of the
 * brand's active coupons it's applied; otherwise a friendly error shows. No
 * coupon list is displayed. The server re-validates authoritatively at checkout.
 */
export function CouponInput({
  coupons,
  isLoading = false,
  appliedCode,
  discountRupees,
  grossPaise,
  onApply,
  onRemove,
  disabled = false,
}: CouponInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const appliedCoupon = useMemo(
    () => coupons.find((c) => c.code === appliedCode) ?? null,
    [coupons, appliedCode],
  );

  const handleApply = () => {
    const code = value.trim().toUpperCase();
    if (!code) {
      setError("Enter a coupon code first");
      return;
    }
    const match = coupons.find((c) => c.code === code);
    if (!match) {
      setError("Oops! We don't have a coupon like that 🙈");
      return;
    }
    if (match.alreadyUsed) {
      setError("Looks like you've already used this one");
      return;
    }
    setError(null);
    setValue("");
    onApply(match.code);
  };

  const handleRemove = () => {
    setError(null);
    setValue("");
    onRemove();
  };

  // Applied state — a clean removable confirmation row.
  if (appliedCode) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {appliedCode} applied
              </div>
              <div className="text-xs text-emerald-600/90 dark:text-emerald-400/90">
                {appliedCoupon
                  ? `${couponShortLabel(appliedCoupon)} · −${inr(discountRupees)}`
                  : `−${inr(discountRupees)} off`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplyTyped}
            disabled={disabled || value.trim().length === 0}
            className="shrink-0 px-4 text-sm font-bold text-primary transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60"
          >
            Apply
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Tag className="size-3.5" /> Have a coupon code?
      </label>
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
          disabled={disabled}
          placeholder="Paste your code here"
          autoCapitalize="characters"
          spellCheck={false}
          className={[
            "min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm font-medium uppercase tracking-wide text-foreground outline-none transition-colors placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground disabled:opacity-50",
            error ? "border-red-400 focus:border-red-500" : "border-border focus:border-primary",
          ].join(" ")}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={disabled || isLoading || value.trim().length === 0}
          className="shrink-0 rounded-lg border border-foreground bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply
        </button>
      </div>
      {error ? (
        <p className="text-xs font-medium text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
