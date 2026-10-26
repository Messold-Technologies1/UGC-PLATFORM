"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  brandOrderDetailsQueryOptions,
  type BrandOrderDetailsResponse,
} from "@/features/orders/api/get-brand-order-details";
import { createTravelAddOnCheckout } from "@/features/payments/api/create-travel-add-on-checkout";
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
 * The add-on lands on the order only on the verified Razorpay webhook, which
 * arrives a moment after the modal closes — so the client success callback alone
 * can't be trusted. Fetch the order a few times until it reports travel as
 * purchased, then confirm to the brand (everything that gates on travel reads
 * the same flag).
 *
 * fetchQuery, not refetchQueries: the buy button also lives in the submit-brief
 * dialog, which lists orders and never mounts any one order's details query —
 * a refetch there would have nothing to refetch and the poll would always time
 * out. Fetching seeds the cache either way, so an open brief form updates too.
 */
async function pollUntilTravelPurchased(
  queryClient: QueryClient,
  orderId: string,
): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const data = await queryClient
      .fetchQuery<BrandOrderDetailsResponse>({
        ...brandOrderDetailsQueryOptions(orderId),
        staleTime: 0,
      })
      .catch(() => null);
    if (data?.order?.travelAddOnPurchased) {
      // The orders list carries its own copy of the travel state (the dialog
      // reads it per order), so it has to be refreshed alongside the details.
      await queryClient.invalidateQueries({ queryKey: ["orders", "brand"] });
      toast.success("Travel added to this order", {
        description: "You can submit the brief with an on-location shoot now.",
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  await queryClient.invalidateQueries({ queryKey: ["orders", "brand"] });
  toast.message("Your payment is being confirmed", {
    description:
      "Travel will appear on this order in a moment — refresh if needed.",
  });
}

/**
 * Buy the creator's travel add-on for a paid order from the brief form, so a
 * brief that asks for an on-location shoot can be submitted. Payment capture is
 * asynchronous (webhook), so on success we poll the order until the add-on
 * shows up rather than assuming it.
 */
export function useBuyTravelAddOn(orderId: string) {
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

  const buyTravelAddOn = useCallback(async () => {
    if (isProcessing || !orderId) return false;
    setIsProcessing(true);

    try {
      const session = await createTravelAddOnCheckout(orderId);
      await openRazorpayCheckout({
        session,
        description: "Travel within City",
        user: user ?? undefined,
        onSuccess: () => {
          toast.success("Payment received", {
            description: "Adding travel to your order…",
          });
          void pollUntilTravelPurchased(queryClient, orderId).finally(() =>
            setIsProcessing(false),
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

  return { isGatewayReady, isProcessing, buyTravelAddOn };
}
