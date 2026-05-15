"use client";

import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { brandOrderDetailsQueryOptions } from "@/features/orders/api/get-brand-order-details";
import { toast } from "sonner";
import type { AddOn, CreatorProfile, Package } from "@/features/creators/types";
import type { CheckoutSession } from "@/features/payments/api/create-checkout";
import { useCreateCheckoutMutation } from "@/features/payments/hooks/use-create-checkout-mutation";
import { useAuth } from "@/providers/auth-provider";

const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Razorpay checkout is only available in the browser."),
    );
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
    const handleError = () =>
      reject(new Error("Failed to load Razorpay checkout."));

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener(
        "load",
        () => handleLoad(existingScript),
        {
          once: true,
        },
      );
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

interface UseRazorpayCheckoutArgs {
  creator: CreatorProfile;
  selectedPackage: Package | null;
  selectedAddOns?: AddOn[];
}

export function useRazorpayCheckout({
  creator,
  selectedPackage,
  selectedAddOns = [],
}: UseRazorpayCheckoutArgs) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cachedSession, setCachedSession] = useState<{
    selectionSignature: string;
    session: CheckoutSession;
  } | null>(null);
  const [isGatewayReady, setIsGatewayReady] = useState(false);
  const createCheckoutMutation = useCreateCheckoutMutation();

  const selectionSignature = useMemo(
    () =>
      [
        creator.id,
        selectedPackage?.id ?? "",
        selectedAddOns.map((addOn) => addOn.id).join(","),
      ].join("|"),
    [creator.id, selectedAddOns, selectedPackage?.id],
  );

  const localTotal = useMemo(
    () =>
      (selectedPackage?.price ?? 0) +
      selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0),
    [selectedAddOns, selectedPackage?.price],
  );

  const checkoutSession =
    cachedSession?.selectionSignature === selectionSignature
      ? cachedSession.session
      : null;

  const total = checkoutSession
    ? Math.round(checkoutSession.amountPaise / 100)
    : localTotal;

  const redirectToBriefCreation = useCallback(
    (orderId: string) => {
      const href = `/brand/briefs/create?orderId=${encodeURIComponent(orderId)}`;
      router.replace(href);
      router.refresh();
    },
    [router],
  );

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

  const openRazorpayCheckout = useCallback(
    async (session: CheckoutSession) => {
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
          void queryClient.prefetchQuery(
            brandOrderDetailsQueryOptions(session.orderId),
          );
          toast.success("Payment successful", {
            description: "Redirecting to brief creation...",
          });
          redirectToBriefCreation(session.orderId);
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
            response.error?.description?.trim() ||
            "Your payment could not be completed.",
        });
      });

      razorpay.open();
    },
    [
      creator.id,
      queryClient,
      redirectToBriefCreation,
      selectedPackage?.id,
      selectedPackage?.label,
      user?.email,
      user?.name,
    ],
  );

  const startCheckout = useCallback(async () => {
    if (!selectedPackage || isProcessing) {
      return false;
    }

    setIsProcessing(true);

    try {
      const session =
        checkoutSession ??
        (await createCheckoutMutation.mutateAsync({
          creatorId: creator.id,
          packageId: selectedPackage.id,
          ...(selectedAddOns.length > 0
            ? { addOnIds: selectedAddOns.map((addOn) => addOn.id) }
            : {}),
        }));

      if (!checkoutSession) {
        setCachedSession({
          selectionSignature,
          session,
        });
      }

      await openRazorpayCheckout(session);
      return true;
    } catch (error) {
      setIsProcessing(false);
      toast.error("Unable to start checkout", {
        description: getErrorMessage(error),
      });
      return false;
    }
  }, [
    checkoutSession,
    createCheckoutMutation,
    creator.id,
    isProcessing,
    openRazorpayCheckout,
    selectionSignature,
    selectedAddOns,
    selectedPackage,
  ]);

  return {
    isGatewayReady,
    isProcessing,
    startCheckout,
    total,
  };
}
