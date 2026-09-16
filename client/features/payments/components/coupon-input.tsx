"use client";

import { useMemo, useState } from "react";
import { Check, Lock, TicketPercent, X } from "lucide-react";
import {
  computeCouponDiscountPaise,
  couponShortLabel,
  type AvailableCoupon,
} from "@/features/payments/lib/coupon-discount";

interface CouponInputProps {
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
 * Coupons & offers panel: a code entry box on top, then the brand's available
 * coupons rendered as ticket cards (offer text, code, per-order savings, Apply).
 * Used coupons are shown locked. Validation is client-side against the available
 * list; the server re-validates authoritatively at checkout.
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

  const savingsFor = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of coupons) {
      map.set(
        c.id,
        Math.round(
          computeCouponDiscountPaise(c.discountType, c.discountValue, grossPaise) /
            100,
        ),
      );
    }
    return map;
  }, [coupons, grossPaise]);

  const handleApplyTyped = () => {
    const code = value.trim().toUpperCase();
    if (!code) {
      setError("Enter a coupon code");
      return;
    }
    const match = coupons.find((c) => c.code === code);
    if (!match) {
      setError("This code isn't valid or has expired");
      return;
    }
    if (match.alreadyUsed) {
      setError("You've already used this coupon");
      return;
    }
    setError(null);
    setValue("");
    onApply(match.code);
  };

  const applyCode = (code: string) => {
    setError(null);
    setValue("");
    onApply(code);
  };

  return (
    <div className="space-y-3">
      {/* Code entry */}
      <div>
        <div
          className={[
            "flex items-stretch overflow-hidden rounded-xl border bg-white transition-colors",
            error ? "border-red-400" : "border-border focus-within:border-primary",
          ].join(" ")}
        >
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
                handleApplyTyped();
              }
            }}
            disabled={disabled}
            placeholder="Enter Coupon Code"
            autoCapitalize="characters"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm font-medium uppercase tracking-wide text-foreground outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleApplyTyped}
            disabled={disabled || value.trim().length === 0}
            className="shrink-0 px-4 text-sm font-bold text-primary transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60"
          >
            Apply
          </button>
        </div>
        {error ? (
          <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
        ) : null}
      </div>

      {/* Available coupons */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading offers…</p>
      ) : coupons.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-bold text-foreground">Coupons</h4>
            {appliedCode && discountRupees > 0 ? (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Saved {inr(discountRupees)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Apply a coupon to save
              </span>
            )}
          </div>

          <div className="max-h-[280px] space-y-2.5 overflow-y-auto scroll-thin">
            {coupons.map((coupon) => {
              const isApplied = coupon.code === appliedCode;
              const used = coupon.alreadyUsed;
              const saves = savingsFor.get(coupon.id) ?? 0;
              return (
                <div
                  key={coupon.id}
                  className={[
                    "overflow-hidden rounded-xl border transition-colors",
                    isApplied
                      ? "border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/30"
                      : used
                        ? "border-border/60 bg-muted/30"
                        : "border-border bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2.5 p-3">
                    <span
                      className={[
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                        used
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary",
                      ].join(" ")}
                    >
                      {used ? (
                        <Lock className="size-3.5" />
                      ) : (
                        <TicketPercent className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={[
                          "text-sm font-bold",
                          used ? "text-muted-foreground" : "text-foreground",
                        ].join(" ")}
                      >
                        {couponShortLabel(coupon)}
                      </p>
                      {coupon.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {coupon.description}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {coupon.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-dashed border-border/70 px-3 py-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
                      {coupon.code}
                    </span>
                    {used ? (
                      <span className="text-xs font-semibold text-muted-foreground">
                        Already used
                      </span>
                    ) : isApplied ? (
                      <button
                        type="button"
                        onClick={onRemove}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 transition-opacity hover:opacity-80 disabled:opacity-50 dark:text-emerald-400"
                      >
                        <Check className="size-3.5" strokeWidth={3} /> Applied
                        <X className="ml-0.5 size-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => applyCode(coupon.code)}
                        disabled={disabled}
                        className="text-xs font-bold text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
                      >
                        {saves > 0 ? `Apply · save ${inr(saves)}` : "Apply"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
