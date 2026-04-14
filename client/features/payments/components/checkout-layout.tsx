"use client";

import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreditCard, Lock, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CheckoutSession } from "@/features/payments/api/create-checkout";
import { useCreateCheckoutMutation } from "@/features/payments/hooks/use-create-checkout-mutation";
import { useAuth } from "@/providers/auth-provider";
import type { CreatorProfile, Package } from "@/features/creators/types";

interface CheckoutLayoutProps {
  creator: CreatorProfile;
  selectedPackage: Package | null;
}

const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay checkout is only available in the browser."));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_URL}"]`,
    );

    const handleLoad = (script: HTMLScriptElement) => {
      script.dataset.loaded = "true";
      resolve();
    };
    const handleError = () => reject(new Error("Failed to load Razorpay checkout."));

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }
      existingScript.addEventListener("load", () => handleLoad(existingScript), {
        once: true,
      });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;
    script.dataset.loaded = "false";
    script.addEventListener("load", () => handleLoad(script), { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.body.appendChild(script);
  }).catch((error) => {
    razorpayScriptPromise = null;
    throw error;
  });

  return razorpayScriptPromise;
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.join(", ");
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Please try again in a moment.";
}

export function CheckoutLayout({
  creator,
  selectedPackage,
}: CheckoutLayoutProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession | null>(null);
  const [isGatewayReady, setIsGatewayReady] = useState(false);
  const createCheckoutMutation = useCreateCheckoutMutation();

  const packagePrice = selectedPackage?.price ?? 0;
  const total = packagePrice;

  useEffect(() => {
    let isActive = true;

    void loadRazorpayCheckoutScript()
      .then(() => {
        if (isActive) {
          setIsGatewayReady(true);
        }
      })
      .catch(() => {
        if (isActive) {
          setIsGatewayReady(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const openRazorpayCheckout = async (session: CheckoutSession) => {
    await loadRazorpayCheckoutScript();
    setIsGatewayReady(true);

    if (!window.Razorpay) {
      throw new Error("Razorpay checkout is unavailable right now.");
    }

    let didCompletePayment = false;

    const razorpay = new window.Razorpay({
      key: session.razorpayKeyId,
      amount: session.amountPaise,
      currency: session.currency,
      name: "Collabry",
      description: `${selectedPackage?.label ?? "Creator"} package checkout`,
      order_id: session.razorpayOrderId,
      prefill: {
        name: user?.name ?? undefined,
        email: user?.email ?? undefined,
      },
      notes: {
        creatorId: creator.id,
        packageId: selectedPackage?.id ?? "",
        platformOrderId: session.orderId,
      },
      retry: {
        enabled: true,
        max_count: 1,
      },
      theme: {
        color: "#111827",
      },
      handler: () => {
        didCompletePayment = true;
        setIsProcessing(false);
        toast.success("Payment successful", {
          description: "Redirecting to your order...",
        });
        router.push(`/brand/orders/${session.orderId}`);
      },
      modal: {
        ondismiss: () => {
          if (didCompletePayment) {
            return;
          }

          setIsProcessing(false);
          toast.message("Checkout closed", {
            description: "You can reopen payment whenever you're ready.",
          });
        },
      },
    });

    razorpay.on("payment.failed", (response) => {
      setIsProcessing(false);
      toast.error("Payment failed", {
        description:
          response.error?.description?.trim() || "Your payment could not be completed.",
      });
    });

    razorpay.open();
  };

  const handlePayment = async () => {
    if (!selectedPackage) {
      return;
    }

    setIsProcessing(true);

    try {
      const session =
        checkoutSession ??
        (await createCheckoutMutation.mutateAsync({
          creatorId: creator.id,
          packageId: selectedPackage.id,
        }));

      if (!checkoutSession) {
        setCheckoutSession(session);
      }

      await openRazorpayCheckout(session);
    } catch (error) {
      setIsProcessing(false);
      toast.error("Unable to start checkout", {
        description: getErrorMessage(error),
      });
    }
  };

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
            onClick={handlePayment}
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
