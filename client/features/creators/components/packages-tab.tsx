import { memo } from "react";
import { Check, Zap, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Package, AddOn } from "../types";

interface PackagesTabProps {
  packages: Package[];
  addOns: AddOn[];
  selectedPackageId: string | null;
  selectedAddOnIds: string[];
  onSelectPackage: (id: string) => void;
  onToggleAddOn: (id: string) => void;
}

const TIER_CONFIG = {
  basic: {
    icon: Zap,
    ring: "ring-foreground/10",
    badge: "bg-foreground/10 text-foreground",
  },
  standard: {
    icon: Star,
    ring: "ring-foreground/15",
    badge: "bg-foreground/10 text-foreground",
  },
  premium: {
    icon: Crown,
    ring: "ring-foreground/20",
    badge: "bg-foreground text-background",
  },
} as const;

export const PackagesTab = memo(function PackagesTab({
  packages,
  addOns,
  selectedPackageId,
  selectedAddOnIds,
  onSelectPackage,
  onToggleAddOn,
}: PackagesTabProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {packages.map((pkg) => {
          const config = TIER_CONFIG[pkg.tier];
          const Icon = config.icon;
          const isSelected = selectedPackageId === pkg.id;
          const isPopular = pkg.tier === "standard";

          return (
            <div
              key={pkg.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectPackage(pkg.id); } }}
              className={`relative flex flex-col rounded-2xl border-2 bg-card p-5 transition-all cursor-pointer ${
                isSelected
                  ? `border-foreground shadow-lg ${config.ring} ring-4`
                  : "border-border hover:border-foreground/20 hover:shadow-md"
              }`}
              onClick={() => onSelectPackage(pkg.id)}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-0.5 text-xs font-semibold text-background">
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-2">
                <div className={`flex size-8 items-center justify-center rounded-lg ${config.badge}`}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide">{pkg.label}</h3>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-bold">
                  ₹{pkg.price.toLocaleString("en-IN")}
                </span>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                {pkg.deliveryDays}-day delivery · {pkg.revisions} revision{pkg.revisions > 1 ? "s" : ""}
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={isSelected ? "default" : "outline"}
                className="mt-5 w-full"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPackage(pkg.id);
                }}
              >
                {isSelected ? "Selected" : "Select"}
              </Button>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="text-sm font-medium">Add-ons</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional extras — tap to include or remove from your order
        </p>

        <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
          {addOns.map((addon) => {
            const isChecked = selectedAddOnIds.includes(addon.id);
            return (
              <li key={addon.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                    isChecked
                      ? "border-foreground bg-foreground/5"
                      : "border-border hover:border-foreground/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={() => onToggleAddOn(addon.id)}
                    aria-label={`${addon.label} (+₹${addon.price.toLocaleString("en-IN")})`}
                  />
                  <span
                    className={`pointer-events-none flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                      isChecked
                        ? "border-foreground bg-foreground text-background"
                        : "border-border"
                    }`}
                    aria-hidden
                  >
                    {isChecked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
                    {addon.label}{" "}
                    <span className="text-muted-foreground">
                      (+₹{addon.price.toLocaleString("en-IN")})
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
});
