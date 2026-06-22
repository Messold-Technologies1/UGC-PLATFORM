import { memo } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Package, AddOn } from "../types";

interface OrderSummaryProps {
  selectedPackage: Package | null;
  addOns: AddOn[];
  selectedAddOnIds: string[];
  isProcessing?: boolean;
  onProceedToCheckout?: () => void;
}

export const OrderSummary = memo(function OrderSummary({
  selectedPackage,
  addOns,
  selectedAddOnIds,
  isProcessing = false,
  onProceedToCheckout,
}: OrderSummaryProps) {
  const selectedAddOns = addOns.filter((a) => selectedAddOnIds.includes(a.id));
  const packagePrice = selectedPackage?.price ?? 0;
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const total = packagePrice + addOnsTotal;

  if (!selectedPackage) {
    return (
      <div className="rounded-3xl border-0 bg-card p-6 sm:p-8 shadow-sm flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 mb-6">
          <ShoppingBag className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold tracking-tight">
          No package selected
        </h3>
        <p className="mt-3 text-sm text-muted-foreground max-w-50 leading-relaxed">
          Choose a package from the left to start collaborating with the
          creator.
        </p>

        <Button
          className="mt-8 w-full font-semibold pointer-events-none opacity-50 bg-muted text-muted-foreground hover:bg-muted"
          size="lg"
          aria-label="Proceed to checkout disabled"
        >
          Proceed to Checkout
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border-0 bg-card p-6 sm:p-8 shadow-sm">
      <h3 className="text-lg font-bold tracking-tight">Order Summary</h3>

      <div className="mt-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold">
              {selectedPackage.label} Package
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {selectedPackage.deliveryDays}-day delivery
            </p>
          </div>
          <span className="text-base font-bold">
            ₹{selectedPackage.price.toLocaleString("en-IN")}
          </span>
        </div>

        {selectedAddOns.length > 0 && (
          <>
            <div className="border-t border-border/50 pt-4" />
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Add-ons
              </p>
              {selectedAddOns.map((addon) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">
                    {addon.label}
                    {addon.deliveryDays != null ? (
                      <span className="ml-1 text-xs font-normal text-primary">
                        ({addon.deliveryDays}d delivery)
                      </span>
                    ) : null}
                  </span>
                  <span className="font-semibold text-muted-foreground">
                    +₹{addon.price.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-border/50 pt-5 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-bold text-primary">
              ₹{total.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      <Button
        className="mt-8 w-full font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        size="lg"
        aria-label="Proceed to checkout"
        disabled={isProcessing}
        onClick={onProceedToCheckout}
      >
        {isProcessing ? "Opening Razorpay..." : "Proceed to Checkout"}
      </Button>

      <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
        Secure checkout powered by Razorpay.
      </p>
    </div>
  );
});
