"use client";

import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { brandOrderDetailsQueryOptions } from "@/features/orders/api/get-brand-order-details";
import { toast } from "sonner";
import type { AddOn, CreatorProfile, Package } from "@/features/creators/types";
import type { CheckoutSession } from "@/features/payments/api/create-checkout";
import {
  clearStoredCheckoutSession,
  readStoredCheckoutSession,
  writeStoredCheckoutSession,
} from "@/features/payments/lib/checkout-session-storage";
import {
  loadRazorpayCheckoutScript,
  openRazorpayCheckout,
} from "@/features/payments/lib/open-razorpay-checkout";
import { useCreateCheckoutMutation } from "@/features/payments/hooks/use-create-checkout-mutation";
import { useAuth } from "@/providers/auth-provider";

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

  const persistedSession = useMemo(
    () => readStoredCheckoutSession(selectionSignature),
    [selectionSignature],
  );

  const checkoutSession =
    cachedSession?.selectionSignature === selectionSignature
      ? cachedSession.session
      : persistedSession;

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

  const launchCheckout = useCallback(
    async (session: CheckoutSession) => {
      await openRazorpayCheckout({
        session,
        description: `${selectedPackage?.label ?? "Creator"} package checkout`,
        user: user ?? undefined,
        notes: {
          creatorId: creator.id,
          packageId: selectedPackage?.id ?? "",
        },
        onSuccess: (orderId) => {
          setIsProcessing(false);
          clearStoredCheckoutSession(selectionSignature);
          void queryClient.prefetchQuery(brandOrderDetailsQueryOptions(orderId));
          toast.success("Payment successful", {
            description: "Redirecting to brief creation...",
          });
          redirectToBriefCreation(orderId);
        },
        onDismiss: () => {
          setIsProcessing(false);
        },
      });
    },
    [
      creator.id,
      queryClient,
      redirectToBriefCreation,
      selectedPackage?.id,
      selectedPackage?.label,
      selectionSignature,
      user,
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

      setCachedSession({
        selectionSignature,
        session,
      });
      writeStoredCheckoutSession(selectionSignature, session);

      await launchCheckout(session);
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
    launchCheckout,
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
