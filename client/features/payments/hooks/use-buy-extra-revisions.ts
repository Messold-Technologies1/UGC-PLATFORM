"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  brandOrderDetailsQueryOptions,
  type BrandOrderDetailsResponse,
} from "@/features/orders/api/get-brand-order-details";
import { createRevisionCheckout } from "@/features/payments/api/create-revision-checkout";
import {
  loadRazorpayCheckoutScript,
  openRazorpayCheckout,
} from "@/features/payments/lib/open-razorpay-checkout";
import { useAuth } from "@/providers/auth-provider";

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && message.length > 0) return message.join(", ");
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Please try again in a moment.";
}

/**
 * The cap is raised only on the verified Razorpay webhook, which lands a moment
 * after the modal closes — so we can't trust the client success callback alone.
 * Refetch the order a few times until maxRevisionsSnapshot grows past what it
 * was before, then tell the brand they can request another revision.
 */
async function pollUntilCapIncreases(
  queryClient: QueryClient,
  orderId: string,
  beforeMax: number | null,
): Promise<void> {
  const queryKey = brandOrderDetailsQueryOptions(orderId).queryKey;
  for (let attempt = 0; attempt < 8; attempt++) {
    await queryClient.refetchQueries({ queryKey });
    const data =
      queryClient.getQueryData<BrandOrderDetailsResponse>(queryKey);
    const max = data?.order?.maxRevisionsSnapshot ?? null;
    if (beforeMax == null || (max != null && max > beforeMax)) {
      toast.success("Revisions added", {
        description: "You can request another revision now.",
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  toast.message("Your revisions are on the way", {
    description: "They'll appear here in a moment — refresh if needed.",
  });
}

/**
 * Buy extra revisions on an order via Razorpay, mirroring the resume-checkout
 * flow. Payment capture is asynchronous (webhook), so on success we poll the
 * order until the cap increases rather than assuming it immediately.
 */
export function useBuyExtraRevisions(orderId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGatewayReady, setIsGatewayReady] = useState(false);

  useEffect(() => {
    let isActive = true;
    void loadRazorpayCheckoutScript()
      .then(() => {
        if (isActive) setIsGatewayReady(true);
      })
      .catch(() => {
        if (isActive) setIsGatewayReady(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const buyRevisions = useCallback(async () => {
    if (isProcessing) return false;
    setIsProcessing(true);

    const queryKey = brandOrderDetailsQueryOptions(orderId).queryKey;
    const before =
      queryClient.getQueryData<BrandOrderDetailsResponse>(queryKey);
    const beforeMax = before?.order?.maxRevisionsSnapshot ?? null;

    try {
      const session = await createRevisionCheckout(orderId);
      await openRazorpayCheckout({
        session,
        description: "Extra revisions",
        user: user ?? undefined,
        onSuccess: () => {
          toast.success("Payment received", {
            description: "Adding your revisions…",
          });
          void pollUntilCapIncreases(queryClient, orderId, beforeMax).finally(
            () => setIsProcessing(false),
          );
        },
        onDismiss: () => {
          setIsProcessing(false);
        },
      });
      return true;
    } catch (error) {
      setIsProcessing(false);
      toast.error("Unable to start payment", {
        description: getErrorMessage(error),
      });
      return false;
    }
  }, [isProcessing, orderId, queryClient, user]);

  return { isGatewayReady, isProcessing, buyRevisions };
}
