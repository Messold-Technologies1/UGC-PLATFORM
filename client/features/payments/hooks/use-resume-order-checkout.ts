"use client";

import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { brandOrderDetailsQueryOptions } from "@/features/orders/api/get-brand-order-details";
import { toast } from "sonner";
import { resumeCheckout } from "@/features/payments/api/resume-checkout";
import {
  loadRazorpayCheckoutScript,
  openRazorpayCheckout,
} from "@/features/payments/lib/open-razorpay-checkout";
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

export function useResumeOrderCheckout(orderId: string, packageName: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGatewayReady, setIsGatewayReady] = useState(false);

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

  const resumePayment = useCallback(async () => {
    if (isProcessing) {
      return false;
    }

    setIsProcessing(true);

    try {
      const session = await resumeCheckout(orderId);

      await openRazorpayCheckout({
        session,
        description: `${packageName} package checkout`,
        user: user ?? undefined,
        onSuccess: (paidOrderId) => {
          setIsProcessing(false);
          void queryClient.invalidateQueries({
            queryKey: brandOrderDetailsQueryOptions(paidOrderId).queryKey,
          });
          toast.success("Payment successful", {
            description: "Redirecting to brief creation...",
          });
          router.replace(
            `/brand/briefs/create?orderId=${encodeURIComponent(paidOrderId)}`,
          );
          router.refresh();
        },
        onDismiss: () => {
          setIsProcessing(false);
        },
      });

      return true;
    } catch (error) {
      setIsProcessing(false);
      toast.error("Unable to resume payment", {
        description: getErrorMessage(error),
      });
      return false;
    }
  }, [isProcessing, orderId, packageName, queryClient, router, user]);

  return {
    isGatewayReady,
    isProcessing,
    resumePayment,
  };
}
