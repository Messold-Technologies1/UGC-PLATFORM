import { toast } from "sonner";
import type { CheckoutSession } from "@/features/payments/api/create-checkout";

const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise: Promise<void> | null = null;

export function loadRazorpayCheckoutScript(): Promise<void> {
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
        { once: true },
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

export type OpenRazorpayCheckoutParams = {
  session: CheckoutSession;
  description: string;
  user?: {
    name?: string | null;
    email?: string | null;
  };
  notes?: Record<string, string>;
  onSuccess: (orderId: string) => void;
  onDismiss?: () => void;
  /** Called when Razorpay reports a failed payment (distinct from a dismiss). */
  onFailure?: () => void;
};

export async function openRazorpayCheckout({
  session,
  description,
  user,
  notes,
  onSuccess,
  onDismiss,
  onFailure,
}: OpenRazorpayCheckoutParams): Promise<void> {
  await loadRazorpayCheckoutScript();

  if (!window.Razorpay) {
    throw new Error("Razorpay checkout is unavailable right now.");
  }

  let didCompletePayment = false;

  const razorpay = new window.Razorpay({
    key: session.razorpayKeyId,
    amount: session.amountPaise,
    currency: session.currency,
    name: "Collabry",
    description,
    order_id: session.razorpayOrderId,
    prefill: {
      name: user?.name ?? undefined,
      email: user?.email ?? undefined,
    },
    notes: {
      platformOrderId: session.orderId,
      ...notes,
    },
    retry: {
      // When store credit was reserved for this order, a failed payment returns
      // the credit and closes the order server-side, so an in-modal retry would
      // pay into a dead order. Disable retry for credit orders — the brand
      // re-checks out fresh (which reserves credit again).
      enabled: !(
        session.creditsAppliedPaise && session.creditsAppliedPaise > 0
      ),
      max_count: 1,
    },
    theme: {
      color: "#111827",
    },
    handler: () => {
      didCompletePayment = true;
      onSuccess(session.orderId);
    },
    modal: {
      ondismiss: () => {
        if (didCompletePayment) {
          return;
        }

        onDismiss?.();
        toast.message("Checkout closed", {
          description: "You can reopen payment whenever you're ready.",
        });
      },
    },
  });

  razorpay.on("payment.failed", (response) => {
    onFailure?.();
    onDismiss?.();
    toast.error("Payment failed", {
      description:
        response.error?.description?.trim() ||
        "Your payment could not be completed.",
    });
  });

  razorpay.open();
}
