import type { CheckoutSession } from "@/features/payments/api/create-checkout";

/**
 * Checkout state kept per browser tab.
 *
 * Two things are stored, and the distinction matters:
 *
 *  - the ATTEMPT KEY, one per creator: the identity of a single "I want to
 *    order from this creator" intent. It is sent to the server as
 *    checkoutSessionKey, which reuses the draft order belonging to that attempt
 *    and closes only the drafts it replaced. Cleared once the attempt ends
 *    (paid, or failed), so the brand's NEXT checkout with the same creator is a
 *    new intent and becomes a separate order — that is what lets them place two
 *    orders with one creator for two different briefs.
 *
 *  - the SESSION for that attempt, alongside the selection it was priced for.
 *    Reusing a session whose cart has since changed would send the brand to
 *    Razorpay for the wrong amount, so the caller must pass the current
 *    selection signature and a mismatch reads as a miss.
 *
 * Keying the session by the attempt (not by the cart) is the point: two
 * deliberate orders with identical package and add-ons produce the same cart
 * signature, so a cart-keyed cache silently collapsed them into one order.
 */

const SESSION_PREFIX = "ugc:checkout:v2:";
const ATTEMPT_PREFIX = "ugc:checkout:attempt:v1:";

type StoredCheckoutSession = {
  selectionSignature: string;
  session: CheckoutSession;
};

function randomKey(): string {
  // crypto.randomUUID needs a secure context; fall back for http:// dev hosts
  // and older browsers. The value only has to be unique per brand, so a
  // non-cryptographic fallback is fine.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = (n: number) =>
    Math.floor(Math.random() * 16 ** n)
      .toString(16)
      .padStart(n, "0");
  // RFC 4122 v4 shape — the server validates this as a UUID.
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${((8 + Math.random() * 4) | 0).toString(
    16,
  )}${hex(3)}-${hex(12)}`;
}

function attemptStorageKey(creatorId: string): string {
  return `${ATTEMPT_PREFIX}${creatorId}`;
}

export function checkoutSessionStorageKey(attemptKey: string): string {
  return `${SESSION_PREFIX}${attemptKey}`;
}

/**
 * The attempt key for this creator, creating one on first use. Stable across a
 * reload of the same tab, so refreshing mid-checkout resumes the attempt
 * instead of orphaning its draft order.
 */
export function readOrCreateCheckoutAttemptKey(creatorId: string): string {
  if (typeof window === "undefined") return randomKey();

  try {
    const existing = sessionStorage.getItem(attemptStorageKey(creatorId));
    if (existing) return existing;
    const created = randomKey();
    sessionStorage.setItem(attemptStorageKey(creatorId), created);
    return created;
  } catch {
    // Private mode / blocked storage: a fresh key per call still works, it just
    // can't dedupe across reloads.
    return randomKey();
  }
}

/** Ends the current attempt: the next checkout for this creator is a new one. */
export function clearCheckoutAttemptKey(creatorId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(attemptStorageKey(creatorId));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

export function readStoredCheckoutSession(
  attemptKey: string,
  selectionSignature: string,
): CheckoutSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(checkoutSessionStorageKey(attemptKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredCheckoutSession;
    // Priced for a different cart — treat as a miss so checkout re-prices.
    if (parsed?.selectionSignature !== selectionSignature) return null;

    const session = parsed.session;
    if (
      typeof session?.orderId !== "string" ||
      typeof session.razorpayOrderId !== "string" ||
      typeof session.amountPaise !== "number" ||
      typeof session.currency !== "string" ||
      typeof session.razorpayKeyId !== "string"
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function writeStoredCheckoutSession(
  attemptKey: string,
  selectionSignature: string,
  session: CheckoutSession,
): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(
      checkoutSessionStorageKey(attemptKey),
      JSON.stringify({ selectionSignature, session } satisfies StoredCheckoutSession),
    );
  } catch {
    // Storage full or blocked: the session just isn't cached across reloads.
  }
}

export function clearStoredCheckoutSession(attemptKey: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(checkoutSessionStorageKey(attemptKey));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
