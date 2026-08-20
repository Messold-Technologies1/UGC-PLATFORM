"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  brandOrderDetailsQueryOptions,
  type BrandOrderDetailsResponse,
} from "@/features/orders/api/get-brand-order-details";
import { createUsageRightsCheckout } from "@/features/payments/api/create-usage-rights-checkout";
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
 * Usage-rights days are extended only on the verified Razorpay webhook, which
 * lands a moment after the modal closes — so we can't trust the client success
 * callback alone. Refetch the order a few times until usageRightsExtraDays grows
 * past what it was before, then confirm to the brand.
 */
async function pollUntilUsageDaysIncrease(
  queryClient: QueryClient,
  orderId: string,
  beforeDays: number | null,
): Promise<void> {
  const queryKey = brandOrderDetailsQueryOptions(orderId).queryKey;
  for (let attempt = 0; attempt < 8; attempt++) {
    await queryClient.refetchQueries({ queryKey });
    const data =
      queryClient.getQueryData<BrandOrderDetailsResponse>(queryKey);
    const days = data?.order?.usageRightsExtraDays ?? null;
    if (beforeDays == null || (days != null && days > beforeDays)) {
      toast.success("Usage rights extended", {
        description: "Your extra usage-rights days have been added.",
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  toast.message("Your extension is on the way", {
    description: "It'll appear here in a moment — refresh if needed.",
  });
}

/**
 * Buy extra usage-rights time on a completed order via Razorpay, mirroring the
 * resume-checkout flow. Payment capture is asynchronous (webhook), so on success
 * we poll the order until the usage-rights days increase rather than assuming it.
 */
export function useBuyExtraUsageRights(orderId: string) {
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

  const buyUsageRights = useCallback(
    async (quantity = 1) => {
      if (isProcessing) return false;
      setIsProcessing(true);

      const queryKey = brandOrderDetailsQueryOptions(orderId).queryKey;
      const before =
        queryClient.getQueryData<BrandOrderDetailsResponse>(queryKey);
      const beforeDays = before?.order?.usageRightsExtraDays ?? null;

      try {
        const session = await createUsageRightsCheckout(orderId, quantity);
        await openRazorpayCheckout({
          session,
          description: "Extra usage rights",
          user: user ?? undefined,
          onSuccess: () => {
            toast.success("Payment received", {
              description: "Extending your usage rights…",
            });
            void pollUntilUsageDaysIncrease(
              queryClient,
              orderId,
              beforeDays,
            ).finally(() => setIsProcessing(false));
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
    },
    [isProcessing, orderId, queryClient, user],
  );

  return { isGatewayReady, isProcessing, buyUsageRights };
}
