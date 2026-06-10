"use client";

import { memo, useState } from "react";
import { Plus, Minus, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AddOn } from "../types";

interface AddOnsSectionProps {
  addOns: AddOn[];
  selectedAddOnIds: string[];
  onToggleAddOn: (id: string) => void;
}

export const AddOnsSection = memo(function AddOnsSection({
  addOns,
  selectedAddOnIds,
  onToggleAddOn,
}: AddOnsSectionProps) {
  if (addOns.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">Add-ons</h2>
          <p className="text-xs text-muted-foreground">
            Enhance your order with optional extras
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {addOns.map((addOn) => {
          const isSelected = selectedAddOnIds.includes(addOn.id);
          return (
            <button
              key={addOn.id}
              type="button"
              onClick={() => onToggleAddOn(addOn.id)}
              className={cn(
                "group relative flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03]",
              )}
              aria-pressed={isSelected}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background group-hover:border-primary/50",
                )}
              >
                {isSelected ? (
                  <Check className="size-3 stroke-[3]" />
                ) : (
                  <Plus className="size-3 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm font-semibold leading-tight",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {addOn.label}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    +₹{addOn.price.toLocaleString("en-IN")}
                  </span>
                </div>
                {addOn.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {addOn.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedAddOnIds.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {selectedAddOnIds.length} add-on
            {selectedAddOnIds.length > 1 ? "s" : ""} selected
          </span>
          <span className="text-sm font-bold text-primary">
            +₹
            {addOns
              .filter((a) => selectedAddOnIds.includes(a.id))
              .reduce((sum, a) => sum + a.price, 0)
              .toLocaleString("en-IN")}
          </span>
        </div>
      )}
    </section>
  );
});
