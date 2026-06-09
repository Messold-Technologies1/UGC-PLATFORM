import type { CheckoutSession } from "@/features/payments/api/create-checkout";

const STORAGE_PREFIX = "ugc:checkout:";

export function checkoutSessionStorageKey(selectionSignature: string): string {
  return `${STORAGE_PREFIX}${selectionSignature}`;
}

export function readStoredCheckoutSession(
  selectionSignature: string,
): CheckoutSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(
      checkoutSessionStorageKey(selectionSignature),
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CheckoutSession;
    if (
      typeof parsed.orderId !== "string" ||
      typeof parsed.razorpayOrderId !== "string" ||
      typeof parsed.amountPaise !== "number" ||
      typeof parsed.currency !== "string" ||
      typeof parsed.razorpayKeyId !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredCheckoutSession(
  selectionSignature: string,
  session: CheckoutSession,
): void {
  if (typeof window === "undefined") return;

  sessionStorage.setItem(
    checkoutSessionStorageKey(selectionSignature),
    JSON.stringify(session),
  );
}

export function clearStoredCheckoutSession(selectionSignature: string): void {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(checkoutSessionStorageKey(selectionSignature));
}
