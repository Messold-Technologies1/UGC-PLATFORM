import { env } from "@/lib/env";

/**
 * Thin, self-contained wrapper around the Meta (Facebook) Pixel `fbq` global.
 *
 * Everything here is a no-op when {@link env.metaPixelId} is empty or when
 * `window.fbq` has not loaded yet, so callers never have to guard. Removal
 * later is just: delete this file, the `<Script>` block in `app/layout.tsx`,
 * and the handful of `trackPixel*` call sites.
 *
 * The base pixel (init + PageView) is injected in `app/layout.tsx`; this module
 * only fires additional events and reads the Meta attribution cookies.
 */

/** True only in the browser once the pixel loader has installed `fbq`. */
function pixelReady(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(env.metaPixelId) &&
    typeof window.fbq === "function"
  );
}

/**
 * Attach Advanced Matching data (email, name, city, …) to the pixel so Meta can
 * match browser events to more people. Re-initializing the pixel with a
 * user-data object is Meta's supported way to add matching after page load; the
 * pixel SDK normalizes and SHA-256 hashes the values in the browser before they
 * are sent. Pass raw values. No-op when the pixel isn't ready.
 */
export function identifyPixelUser(data: {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
}): void {
  if (!pixelReady()) return;
  const userData: Record<string, string> = {};
  if (data.email) userData.em = data.email;
  if (data.firstName) userData.fn = data.firstName;
  if (data.lastName) userData.ln = data.lastName;
  if (data.city) userData.ct = data.city;
  if (data.state) userData.st = data.state;
  if (data.phone) userData.ph = data.phone;
  if (Object.keys(userData).length === 0) return;
  try {
    window.fbq?.("init", env.metaPixelId, userData);
  } catch {
    // Never let analytics break a user flow.
  }
}

/** Split a full name into first/last for Advanced Matching. */
export function splitFullName(name: string | null | undefined): {
  firstName?: string;
  lastName?: string;
} {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Fire a Meta *standard* event (e.g. "CompleteRegistration", "Lead").
 *
 * Pass `eventId` to deduplicate against a matching server-side Conversions API
 * event (same event name + id → Meta counts them once).
 */
export function trackPixelEvent(
  event: string,
  params?: Record<string, unknown>,
  eventId?: string,
): void {
  if (!pixelReady()) return;
  try {
    if (eventId) {
      window.fbq?.("track", event, params, { eventID: eventId });
    } else {
      window.fbq?.("track", event, params);
    }
  } catch {
    // Never let analytics break a user flow.
  }
}

/** Generate a unique id for browser/server event deduplication. */
export function newMetaEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Fire a Meta *custom* event (anything not in the standard event list).
 *
 * Pass `eventId` to deduplicate against a matching server-side Conversions API
 * event (same event name + id → Meta counts them once).
 */
export function trackPixelCustom(
  event: string,
  params?: Record<string, unknown>,
  eventId?: string,
): void {
  if (!pixelReady()) return;
  try {
    if (eventId) {
      window.fbq?.("trackCustom", event, params, { eventID: eventId });
    } else {
      window.fbq?.("trackCustom", event, params);
    }
  } catch {
    // Never let analytics break a user flow.
  }
}

/** Read a single cookie value in the browser, or undefined. */
function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&")}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * The Meta attribution cookies the pixel drops in the visitor's browser:
 * - `_fbp` — browser/pixel identifier
 * - `_fbc` — the specific ad click (fbclid) that brought them here
 *
 * We read these at signup (in the user's own browser) so the server can replay
 * them later via the Conversions API for events that fire out-of-band — e.g.
 * when an admin approves a creator days after they signed up.
 */
export function getMetaBrowserIds(): { fbp?: string; fbc?: string } {
  return { fbp: readCookie("_fbp"), fbc: readCookie("_fbc") };
}
