import { memo } from "react";
import { Check } from "lucide-react";
import type { Package, AddOn } from "../types";

interface PackagesTabProps {
  packages: Package[];
  addOns: AddOn[];
  selectedPackageId: string | null;
  selectedAddOnIds: string[];
  onSelectPackage: (id: string) => void;
  onToggleAddOn: (id: string) => void;
}

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
      <div className="grid gap-6 sm:grid-cols-3">
        {packages.map((pkg) => {
          const isSelected = selectedPackageId === pkg.id;
          const isPopular = pkg.tier === "standard";

          return (
            <div
              key={pkg.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectPackage(pkg.id);
                }
              }}
              className={`relative flex flex-col justify-between h-[480px] rounded-3xl bg-card p-8 transition-all duration-300 cursor-pointer ${
                isSelected
                  ? "border-2 border-primary scale-105 z-10 shadow-xl shadow-primary/20"
                  : "border border-border hover:border-primary/30 group"
              }`}
              onClick={() => onSelectPackage(pkg.id)}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-linear-to-r from-primary to-primary/80 px-4 py-1 rounded-full z-20">
                  <span className="text-[10px] font-black text-primary-foreground uppercase tracking-[0.2em] whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-primary text-xs font-black uppercase tracking-[0.2em]">
                  {pkg.label}
                </h3>
                <p className="text-4xl font-extrabold tracking-tighter">
                  ₹{pkg.price.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {pkg.deliveryDays}-day delivery · {pkg.revisions} revision
                  {pkg.revisions > 1 ? "s" : ""}
                </p>
              </div>

              <ul className="mt-8 flex-1 space-y-4">
                {pkg.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-foreground/80"
                  >
                    <Check className="mt-0.5 size-5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full mt-10 py-3 rounded-xl font-bold transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                    : "border border-primary/40 text-primary hover:bg-primary/5 group-hover:border-primary/60"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPackage(pkg.id);
                }}
              >
                {isSelected ? "Selected" : "Select"}
              </button>
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
                  className={`relative flex cursor-pointer items-center gap-4 rounded-2xl border p-5 transition-all ${
                    isChecked
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                      : "border-border hover:border-foreground/20 shadow-sm"
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
                    className={`pointer-events-none flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                      isChecked
                        ? "border-primary bg-primary text-primary-foreground"
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
