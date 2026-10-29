/**
 * Browser-side facts about push, kept apart from React so they can be read
 * once and tested directly.
 */

/** Everything push needs, present. False in older browsers and in SSR. */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * The VAPID public key as the browser wants it.
 *
 * `applicationServerKey` takes raw bytes, while the server stores and serves
 * the key base64url-encoded, which is also what `web-push` generates. The
 * padding and the two substitutions are the whole difference between the two
 * encodings.
 *
 * Returns the ArrayBuffer rather than the Uint8Array over it: both are valid
 * BufferSource values, but the typed array's element type is generic from
 * TypeScript 5.7 on and no longer narrows to what `applicationServerKey`
 * accepts.
 */
export function urlBase64ToApplicationServerKey(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return buffer;
}

/**
 * Whether this browser can still be asked.
 *
 * "denied" is terminal: calling requestPermission() again resolves denied
 * without showing anything, and only the user can undo it in site settings.
 * That is why the toggle must be what triggers the request — the one attempt
 * per browser is spent on someone who has already said yes to us.
 */
export function canRequestPermission(): boolean {
  return pushSupported() && Notification.permission !== "denied";
}

/**
 * Drop this browser's subscription without touching the account's column.
 *
 * For sign-out, where there is no toggle and no React: the next person on this
 * machine must not inherit push for the account that just left. Deliberately
 * best-effort and never throwing — a sign-out that fails because a
 * notification could not be unsubscribed would be a worse bug than the stale
 * subscription, which the server prunes on the 410 its next send gets anyway.
 *
 * The DELETE must go out before the session cookie is gone, so call this
 * before the logout request, not after.
 */
export async function forgetPushSubscriptionForSignOut(
  deleteOnServer: (endpoint: string) => Promise<void>,
): Promise<void> {
  if (!pushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    const { endpoint } = subscription;
    await subscription.unsubscribe().catch(() => undefined);
    await deleteOnServer(endpoint).catch(() => undefined);
  } catch {
    // Nothing a signing-out user can do about it, and nothing worth blocking.
  }
}
