import { Country } from "country-state-city";
import { env } from "@/lib/env";

/**
 * Convert a country name (or code) to the ISO 3166-1 alpha-2 code Meta expects
 * (lowercase, e.g. "India" -> "in"). Returns undefined if it can't be resolved.
 */
export function countryToIso2(
  value: string | null | undefined,
): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (/^[A-Za-z]{2}$/.test(v)) return v.toLowerCase();
  const match = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === v.toLowerCase(),
  );
  return match?.isoCode.toLowerCase();
}

/**
 * Thin, self-contained wrapper around the Meta (Facebook) Pixel `fbq` global.
 *
 * Everything here is a no-op when the target dataset's pixel ID is empty or
 * when `window.fbq` has not loaded yet, so callers never have to guard. Removal
 * later is just: delete this file, the `<Script>` block in `app/layout.tsx`,
 * and the handful of `trackPixel*` call sites.
 *
 * The base pixels (init + PageView) are injected in `app/layout.tsx`; this
 * module only fires additional events and reads the Meta attribution cookies.
 */

/**
 * Which dataset an event belongs to. The platform runs two Meta pixels so the
 * creator-side and brand-side ad campaigns each optimize on their own dataset:
 *
 * - `creator` — the original pixel (`NEXT_PUBLIC_META_PIXEL_ID`).
 * - `brand` — the brand dataset (`NEXT_PUBLIC_META_BRAND_PIXEL_ID`), falling
 *   back to the creator pixel when the brand one isn't configured.
 *
 * Both pixels are initialized by the loader in `app/layout.tsx`, so every event
 * fired from here is sent with `trackSingle*` to exactly one of them — a plain
 * `fbq('track', …)` would report to *both* datasets.
 */
export type MetaPixelAudience = "creator" | "brand";

/** The pixel ID an audience reports to, or "" when tracking is switched off. */
export function pixelIdFor(audience: MetaPixelAudience): string {
  if (audience === "brand") {
    return env.metaBrandPixelId || env.metaPixelId;
  }
  return env.metaPixelId;
}

/** True only in the browser once the pixel loader has installed `fbq`. */
function pixelReady(audience: MetaPixelAudience = "creator"): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(pixelIdFor(audience)) &&
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
export function identifyPixelUser(
  data: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    phone?: string | null;
  },
  audience: MetaPixelAudience = "creator",
): void {
  if (!pixelReady(audience)) return;
  const userData: Record<string, string> = {};
  if (data.email) userData.em = data.email;
  if (data.firstName) userData.fn = data.firstName;
  if (data.lastName) userData.ln = data.lastName;
  if (data.city) userData.ct = data.city;
  if (data.state) userData.st = data.state;
  const country = countryToIso2(data.country);
  if (country) userData.country = country;
  if (data.phone) userData.ph = data.phone;
  if (Object.keys(userData).length === 0) return;
  try {
    window.fbq?.("init", pixelIdFor(audience), userData);
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

/** Options shared by {@link trackPixelEvent} and {@link trackPixelCustom}. */
export type MetaPixelEventOptions = {
  /** Shared id for browser/server deduplication. */
  eventId?: string;
  /** Which dataset the event reports to. Defaults to the creator pixel. */
  audience?: MetaPixelAudience;
};

/**
 * Send one event to exactly one pixel. `trackSingle`/`trackSingleCustom` are
 * Meta's per-pixel variants — required here because more than one pixel can be
 * initialized on the page and a plain `track` would report to all of them.
 *
 * Returns whether the event was handed to the pixel, so a caller that is about
 * to navigate away can give the beacon a moment to leave the browser.
 */
function trackOnPixel(
  method: "trackSingle" | "trackSingleCustom",
  event: string,
  params?: Record<string, unknown>,
  options?: MetaPixelEventOptions,
): boolean {
  const audience = options?.audience ?? "creator";
  if (!pixelReady(audience)) return false;
  const pixelId = pixelIdFor(audience);
  try {
    if (options?.eventId) {
      window.fbq?.(method, pixelId, event, params, {
        eventID: options.eventId,
      });
    } else {
      window.fbq?.(method, pixelId, event, params);
    }
    return true;
  } catch {
    // Never let analytics break a user flow.
    return false;
  }
}

/**
 * Fire a Meta *standard* event (e.g. "CompleteRegistration", "Lead").
 *
 * Pass `options.eventId` to deduplicate against a matching server-side
 * Conversions API event (same event name + id → Meta counts them once), and
 * `options.audience` to pick the dataset it reports to.
 */
export function trackPixelEvent(
  event: string,
  params?: Record<string, unknown>,
  options?: MetaPixelEventOptions,
): boolean {
  return trackOnPixel("trackSingle", event, params, options);
}

/** Generate a unique id for browser/server event deduplication. */
export function newMetaEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Fire a Meta *custom* event (anything not in the standard event list), e.g.
 * `CreatorRegistration` / `BrandRegistration`. Same options as
 * {@link trackPixelEvent}.
 */
export function trackPixelCustom(
  event: string,
  params?: Record<string, unknown>,
  options?: MetaPixelEventOptions,
): boolean {
  return trackOnPixel("trackSingleCustom", event, params, options);
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
