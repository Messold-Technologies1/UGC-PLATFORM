"use client";

import { memo, useMemo } from "react";
import { Check, Shield, RotateCcw, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Package, AddOn } from "../types";

interface SidebarPricingCardProps {
  packages: Package[];
  addOns: AddOn[];
  selectedPackageId: string | null;
  selectedAddOnIds: string[];
  onSelectPackage: (id: string) => void;
  onToggleAddOn: (id: string) => void;
  isProcessing?: boolean;
  onProceedToCheckout?: () => void;
}

export const SidebarPricingCard = memo(function SidebarPricingCard({
  packages,
  addOns,
  selectedPackageId,
  selectedAddOnIds,
  onSelectPackage,
  onToggleAddOn,
  isProcessing = false,
  onProceedToCheckout,
}: SidebarPricingCardProps) {
  const selectedPackage = useMemo(
    () =>
      packages.find((p) => p.id === selectedPackageId) ?? packages[0] ?? null,
    [packages, selectedPackageId],
  );

  const addOnsTotal = useMemo(
    () =>
      addOns
        .filter((a) => selectedAddOnIds.includes(a.id))
        .reduce((sum, a) => sum + a.price, 0),
    [addOns, selectedAddOnIds],
  );

  const hasBasicEditing = useMemo(
    () => selectedPackage?.features?.includes("Basic editing") ?? false,
    [selectedPackage],
  );

  const total = (selectedPackage?.price ?? 0) + addOnsTotal;

  if (!selectedPackage) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-5 pb-0">
        {packages.length > 1 && (
          <div className="flex gap-1 mb-4 border-b border-border">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onSelectPackage(pkg.id)}
                className={`flex-1 pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  (selectedPackageId ?? packages[0]?.id) === pkg.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {pkg.label}
              </button>
            ))}
          </div>
        )}

        <p className="text-sm font-medium text-foreground">
          {selectedPackage.label}
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
          ₹{selectedPackage.price.toLocaleString("en-IN")}
        </p>
      </div>

      <div className="px-5 pt-5">
        <p className="text-sm font-semibold text-foreground mb-3">
          What&apos;s included
        </p>
        <ul className="space-y-2.5">
          {selectedPackage.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="size-4 shrink-0 text-primary mt-0.5" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
          <li className="flex items-start gap-2 text-sm">
            <Check className="size-4 shrink-0 text-primary mt-0.5" />
            <span className="text-foreground">
              Delivery in {selectedPackage.deliveryDays} days
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <Check className="size-4 shrink-0 text-primary mt-0.5" />
            <span className="text-foreground">
              {selectedPackage.revisions} revision
              {selectedPackage.revisions > 1 ? "s" : ""} included
            </span>
          </li>
          {hasBasicEditing && (
            <li className="flex items-start gap-2 text-sm">
              <Check className="size-4 shrink-0 text-primary mt-0.5" />
              <span className="text-foreground">
                Basic editing included
              </span>
            </li>
          )}
        </ul>
      </div>

      <div className="my-4 border-t border-border mx-5" />

      <div className="px-5">
        <p className="text-sm font-semibold text-foreground mb-3">
          {addOns.length > 0 ? "Add-ons (select any)" : "Add-ons"}
        </p>
        {addOns.length > 0 ? (
          <ul className="space-y-3">
            {addOns.map((addon) => {
              const isChecked = selectedAddOnIds.includes(addon.id);
              return (
                <li key={addon.id}>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => onToggleAddOn(addon.id)}
                        className="size-4"
                      />
                      <span className="text-sm text-foreground">
                        {addon.label}:
                        {addon.deliveryDays != null ? (
                          <span className="ml-1 text-xs font-medium text-primary">
                            ({addon.deliveryDays}d delivery)
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                     ₹{addon.price.toLocaleString("en-IN")}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No add-ons available</p>
        )}
      </div>

      <div className="my-4 border-t border-border mx-5" />

      <div className="px-5 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Total</span>
        <span className="text-xl font-bold text-foreground">
          ₹{total.toLocaleString("en-IN")}
        </span>
      </div>

      <div className="px-5 pt-4 pb-5">
        <Button
          className="w-full font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          size="lg"
          disabled={isProcessing}
          onClick={onProceedToCheckout}
        >
          {isProcessing ? "Processing..." : "Order Now"}
        </Button>
      </div>

      <div className="border-t border-border px-5 py-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="size-3.5 text-primary shrink-0" />
          100% Secure Payments
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RotateCcw className="size-3.5 text-primary shrink-0" />
          Easy refunds & cancellations
        </div>
      </div>

      <div className="border-t border-border px-5 py-4 text-center">
        <p className="text-xs text-muted-foreground mb-2">
          Need help before ordering?
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Phone className="size-3.5" />
          Contact Support
        </button>
      </div>
    </div>
  );
});
