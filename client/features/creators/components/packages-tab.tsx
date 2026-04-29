import { memo } from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Package, AddOn } from "../types";

interface PackagesTabProps {
  packages: Package[];
  addOns: AddOn[];
  selectedPackageId?: string | null;
  selectedAddOnIds?: string[];
  onSelectPackage?: (id: string) => void;
  onToggleAddOn?: (id: string) => void;
  readOnly?: boolean;
  compact?: boolean;
  horizontalScroll?: boolean;
}

export const PackagesTab = memo(function PackagesTab({
  packages,
  addOns,
  selectedPackageId = null,
  selectedAddOnIds = [],
  onSelectPackage = () => {},
  onToggleAddOn = () => {},
  readOnly = false,
  compact = false,
  horizontalScroll = false,
}: PackagesTabProps) {
  return (
    <div className="space-y-8">
      <div
        className={
          horizontalScroll
            ? "flex overflow-x-auto pt-4 pb-6 -mx-8 px-8 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none] gap-6"
            : `grid gap-6 pt-4 ${compact ? "grid-cols-1" : "sm:grid-cols-3"}`
        }
      >
        {packages.map((pkg) => {
          const isSelected = selectedPackageId === pkg.id;
          const isPopular = pkg.tier === "standard";

          return (
            <Card
              key={pkg.id}
              role={readOnly ? undefined : "button"}
              tabIndex={readOnly ? undefined : 0}
              aria-pressed={readOnly ? undefined : isSelected}
              onKeyDown={(e) => {
                if (readOnly) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectPackage(pkg.id);
                }
              }}
              onClick={() => {
                if (!readOnly) onSelectPackage(pkg.id);
              }}
              className={`flex flex-col relative transition-all duration-300 ${
                horizontalScroll ? "shrink-0 w-[280px] snap-center" : ""
              } ${readOnly ? "" : "cursor-pointer"} ${
                isSelected
                  ? "border-2 border-primary scale-105 z-10 shadow-xl shadow-primary/20"
                  : readOnly
                  ? "border-border"
                  : "hover:border-primary/30 group"
              }`}
            >
              {isPopular && (
                <span className="bg-linear-to-r absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full from-purple-400 to-amber-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-950 ring-1 ring-inset ring-white/20 ring-offset-1 ring-offset-gray-950/5 z-20">
                  Popular
                </span>
              )}

              <CardHeader>
                <CardTitle className="font-medium text-primary text-xs uppercase tracking-[0.2em]">
                  {pkg.label}
                </CardTitle>
                <span className="my-3 block text-4xl font-extrabold tracking-tighter">
                  ₹{pkg.price.toLocaleString("en-IN")}
                </span>
                <CardDescription className="text-sm">
                  {pkg.deliveryDays}-day delivery · {pkg.revisions} revision
                  {pkg.revisions > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <hr className="border-dashed" />

                <ul className="list-outside space-y-3 text-sm">
                  {pkg.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-foreground/80"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              {readOnly ? null : (
                <CardFooter className="mt-auto">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPackage(pkg.id);
                    }}
                  >
                    {isSelected ? "Selected" : "Get Started"}
                  </Button>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>

      <div>
        <h3 className="text-sm font-medium">Add-ons</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional extras — tap to include or remove from your order
        </p>

        <ul
          className={`mt-4 grid list-none gap-3 p-0 ${
            compact ? "grid-cols-1" : "sm:grid-cols-2"
          }`}
        >
          {addOns.map((addon) => {
            const isChecked = selectedAddOnIds.includes(addon.id);
            return (
              <li key={addon.id}>
                <label
                  className={`relative flex items-center gap-4 rounded-2xl border p-5 transition-all ${
                    readOnly ? "cursor-default" : "cursor-pointer"
                  } ${
                    isChecked
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                      : readOnly
                      ? "border-border shadow-sm"
                      : "border-border hover:border-foreground/20 shadow-sm"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    disabled={readOnly}
                    onChange={() => {
                      if (!readOnly) onToggleAddOn(addon.id);
                    }}
                    aria-label={`${addon.label} (+₹${addon.price.toLocaleString(
                      "en-IN",
                    )})`}
                  />
                  {!readOnly && (
                    <span
                      className={`pointer-events-none flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        isChecked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      }`}
                      aria-hidden
                    >
                      {isChecked && (
                        <Check className="size-3" strokeWidth={3} />
                      )}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
                    <span>
                      {addon.label}{" "}
                      <span className="text-muted-foreground">
                        (+₹{addon.price.toLocaleString("en-IN")})
                      </span>
                    </span>
                    {addon.description ? (
                      <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">
                        {addon.description}
                      </span>
                    ) : null}
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
