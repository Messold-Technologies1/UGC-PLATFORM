"use client";

import { useRouter } from "next/navigation";
import { CreditCard, Lock, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddOn, CreatorProfile, Package } from "@/features/creators/types";
import { useRazorpayCheckout } from "@/features/payments/hooks/use-razorpay-checkout";

interface CheckoutLayoutProps {
  creator: CreatorProfile;
  selectedPackage: Package | null;
  selectedAddOns?: AddOn[];
}

export function CheckoutLayout({
  creator,
  selectedPackage,
  selectedAddOns = [],
}: CheckoutLayoutProps) {
  const router = useRouter();
  const { isGatewayReady, isProcessing, startCheckout, total } =
    useRazorpayCheckout({
      creator,
      selectedPackage,
      selectedAddOns,
    });

  if (!selectedPackage) {
    return (
      <div className="rounded-3xl border border-border bg-card p-12 shadow-sm text-center">
        <h3 className="text-xl font-bold tracking-tight">
          No package selected
        </h3>
        <p className="mt-2 text-muted-foreground">
          Please select a package from the creator profile before checking out.
        </p>
        <Button className="mt-6" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }



  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <CreditCard className="size-5" />
            Payment Details
          </h2>

          <div className="rounded-xl border-2 border-dashed border-border p-8 flex flex-col items-center justify-center text-center bg-muted/20">
            <Lock className="size-8 text-muted-foreground mb-4" />
            <p className="font-medium text-foreground">
              Secure Payment Gateway
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[300px]">
              Complete your payment with Razorpay. Your package order will be
              created before the payment window opens.
            </p>
          </div>

          <Button
            className="w-full mt-8 h-14 text-base font-semibold"
            disabled={isProcessing}
            onClick={() => {
              void startCheckout();
            }}
          >
            {isProcessing
              ? "Opening Razorpay..."
              : `Pay ₹${total.toLocaleString("en-IN")}`}
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {isGatewayReady
              ? "Razorpay is ready for secure checkout."
              : "Preparing Razorpay checkout in the background."}
          </p>

          <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
            <Lock className="size-3" />
            Payments are secure and encrypted
          </p>
        </div>
      </div>

      <div className="lg:col-span-5 xl:col-span-4">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm sticky top-24">
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="size-5" />
            Your Order
          </h3>

          <div className="mt-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold line-clamp-1">
                  {creator.name}
                </p>
                <p className="text-sm font-medium mt-1">
                  {selectedPackage.label} Package
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedPackage.deliveryDays}-day delivery
                </p>
              </div>
              <span className="text-base font-bold whitespace-nowrap ml-4">
                ₹{selectedPackage.price.toLocaleString("en-IN")}
              </span>
            </div>

            {selectedAddOns.length > 0 && (
              <div className="border-t border-border/50 pt-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Add-ons
                </p>
                {selectedAddOns.map((addOn) => (
                  <div
                    key={addOn.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{addOn.label}</span>
                    <span className="font-semibold text-muted-foreground">
                      +₹{addOn.price.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
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
        </div>
      </div>
    </div>
  );
}
