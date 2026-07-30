"use client";

import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createBulkCheckout,
  type BulkCheckoutItem,
} from "@/features/payments/api/create-bulk-checkout";
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
 * Bulk checkout from the wishlist: one payment, many orders. Creates the
 * checkout batch, opens Razorpay for the single grand total (reusing the
 * shared opener with the batch id as the session), and on success sends the
 * brand to their orders list where all the new orders appear.
 */
export function useWishlistBulkCheckout() {
  const router = useRouter();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGatewayReady, setIsGatewayReady] = useState(false);

  useEffect(() => {
    let isActive = true;
    void loadRazorpayCheckoutScript()
      .then(() => isActive && setIsGatewayReady(true))
      .catch(() => isActive && setIsGatewayReady(false));
    return () => {
      isActive = false;
    };
  }, []);

  const startBulkCheckout = useCallback(
    async (items: BulkCheckoutItem[]) => {
      if (isProcessing || items.length === 0) return false;
      setIsProcessing(true);

      try {
        const session = await createBulkCheckout({ items });

        if (session.skipped.length > 0) {
          const n = session.skipped.length;
          toast.warning(
            `${n} creator${n === 1 ? "" : "s"} couldn't be added`,
            {
              description:
                "They were skipped — you'll only pay for the remaining orders.",
            },
          );
        }

        await openRazorpayCheckout({
          session: {
            orderId: session.batchId,
            razorpayOrderId: session.razorpayOrderId,
            amountPaise: session.amountPaise,
            currency: session.currency,
            razorpayKeyId: session.razorpayKeyId,
          },
          description: `${session.orderCount} order${
            session.orderCount === 1 ? "" : "s"
          } from your wishlist`,
          user: user ?? undefined,
          notes: { checkoutBatchId: session.batchId },
          onSuccess: () => {
            setIsProcessing(false);
            toast.success("Payment successful", {
              description: "Redirecting to your orders...",
            });
            router.replace("/brand/orders");
            router.refresh();
          },
          onDismiss: () => setIsProcessing(false),
        });
        return true;
      } catch (error) {
        setIsProcessing(false);
        toast.error("Unable to start checkout", {
          description: getErrorMessage(error),
        });
        return false;
      }
    },
    [isProcessing, router, user],
  );

  return { isProcessing, isGatewayReady, startBulkCheckout };
}
