import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Package, AddOn } from "../types";

interface OrderSummaryProps {
  selectedPackage: Package | null;
  addOns: AddOn[];
  selectedAddOnIds: string[];
}

export function OrderSummary({ selectedPackage, addOns, selectedAddOnIds }: OrderSummaryProps) {
  const selectedAddOns = addOns.filter((a) => selectedAddOnIds.includes(a.id));
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const packagePrice = selectedPackage?.price ?? 0;
  const total = packagePrice + addOnsTotal;

  if (!selectedPackage) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
            <ShoppingCart className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-medium">No package selected</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Select a package to see your order summary
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-medium">Order Summary</h3>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{selectedPackage.label} Package</p>
            <p className="text-xs text-muted-foreground">
              {selectedPackage.deliveryDays}-day delivery
            </p>
          </div>
          <span className="text-sm font-medium">
            ₹{selectedPackage.price.toLocaleString("en-IN")}
          </span>
        </div>

        {selectedAddOns.length > 0 && (
          <>
            <div className="border-t border-border/60" />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add-ons</p>
              {selectedAddOns.map((addon) => (
                <div key={addon.id} className="flex items-center justify-between text-sm">
                  <span>{addon.label}</span>
                  <span className="text-muted-foreground">
                    +₹{addon.price.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold">Total</span>
            <span className="text-xl font-bold">
              ₹{total.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      <Button
        className="mt-5 w-full gap-1.5 bg-foreground border-0 text-background hover:opacity-90"
        size="lg"
      >
        Continue
      </Button>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        You won&apos;t be charged yet
      </p>
    </div>
  );
}
