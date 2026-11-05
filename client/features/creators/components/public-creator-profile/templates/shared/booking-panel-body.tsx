"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicProfileViewModel } from "../types";

type BookingPanelBodyProps = {
  model: PublicProfileViewModel;
  /** Add-on rows: rounded pills (v3-style) or bordered boxes (v1-style). */
  addOnStyle?: "pill" | "box";
  className?: string;
  ctaClassName?: string;
  checkClassName?: string;
};

/**
 * The interactive half of a booking panel: package switcher, deliverables,
 * add-on toggles, running total and the booking CTA.
 *
 * Every template wraps this in its own header and card treatment, but the
 * controls and the arithmetic are identical, so they live here. The CTA calls
 * the real booking action — buyers to checkout, visitors to registration.
 */
export function BookingPanelBody({
  model,
  addOnStyle = "box",
  className,
  ctaClassName,
  checkClassName,
}: BookingPanelBodyProps) {
  const { selectedPackage } = model;
  if (!selectedPackage) return null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {model.packages.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {model.packages.map((pack) => (
            <button
              key={pack.id ?? pack.name}
              type="button"
              disabled={!pack.id}
              onClick={() => pack.id && model.selectPackage(pack.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-semibold transition disabled:opacity-60",
                pack.id === selectedPackage.id
                  ? "bg-gc-ink text-white"
                  : "bg-gc-surface text-gc-ink hover:bg-gc-surface-alt",
              )}
            >
              {pack.name}
            </button>
          ))}
        </div>
      )}

      {selectedPackage.deliverables.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="text-sm font-bold text-gc-muted-soft">
            What you get
          </div>
          {selectedPackage.deliverables.map((item) => (
            <span key={item} className="flex items-center gap-2.5 text-base">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full bg-gc-brand-soft text-gc-brand",
                  checkClassName,
                )}
              >
                <Check className="size-3" strokeWidth={3.5} />
              </span>
              {item}
            </span>
          ))}
        </div>
      )}

      {model.addOns.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-sm font-bold text-gc-muted-soft">
            Add-ons <span className="font-normal">· optional</span>
          </div>
          {model.addOns.map((addOn) => (
            <button
              key={addOn.id}
              type="button"
              aria-pressed={addOn.selected}
              onClick={() => model.toggleAddOn(addOn.id)}
              className={cn(
                "flex min-h-13 items-center gap-3 px-3.5 text-left transition",
                addOnStyle === "pill"
                  ? cn(
                      "rounded-full",
                      addOn.selected
                        ? "bg-gc-ink text-white"
                        : "bg-gc-surface text-gc-ink hover:bg-gc-surface-alt",
                    )
                  : cn(
                      "rounded-gc-sm border",
                      addOn.selected
                        ? "border-gc-brand bg-[#FFF5F6]"
                        : "border-gc-line bg-white hover:bg-gc-surface",
                    ),
              )}
            >
              <span
                className={cn(
                  "flex size-5.5 shrink-0 items-center justify-center border-[1.5px]",
                  addOnStyle === "pill" ? "rounded-full" : "rounded-md",
                  addOn.selected
                    ? addOnStyle === "pill"
                      ? "border-gc-brand-muted bg-gc-brand-muted text-gc-ink"
                      : "border-gc-brand bg-gc-brand text-white"
                    : "border-[#cfcbd2]",
                )}
              >
                {addOn.selected && <Check className="size-3" strokeWidth={3.5} />}
              </span>
              <span className="flex-1 text-[15px] font-medium">
                {addOn.name}
              </span>
              <span className="text-[15px] font-bold">
                +{addOn.priceLabel}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-baseline justify-between pt-1">
        <span className="text-base text-gc-ink-muted">Total</span>
        <span className="text-2xl font-extrabold tracking-[-0.02em]">
          {model.totalLabel}
        </span>
      </div>

      <button
        type="button"
        onClick={model.book}
        className={cn(
          "h-14 rounded-full bg-gc-brand text-[17px] font-bold text-white transition hover:bg-gc-brand-hover",
          ctaClassName,
        )}
      >
        {model.isBuyer ? "Continue" : "Book"} · {model.totalLabel}
      </button>

      <p className="m-0 text-center text-xs leading-relaxed text-gc-muted-soft">
        Secure checkout on GoCollab · payment held until you approve the
        delivery
      </p>
    </div>
  );
}
