import { trackPixelCustom, trackPixelEvent } from "@/lib/meta-pixel";

/**
 * Buyer-side (brand / agency) funnel events reported to the **brand** Meta
 * dataset. The creator-side pixel is untouched by anything in this file.
 *
 * Every event carries the acting account's name as reporting metadata, so
 * Events Manager can be broken down by brand/agency. Nothing here sends PII:
 * `brand_name` is a company name, and creators are identified by opaque id
 * only — identifiers belong in Advanced Matching, where the pixel hashes them.
 *
 * See META_TRACKING.md for the dataset split and the env kill switches.
 */

/** Which buyer workspace fired the event. */
export type BuyerAccountType = "brand" | "agency";

/** The acting account, as attached to every buyer event. */
export type BuyerIdentity = {
  accountType: BuyerAccountType;
  /**
   * Brand name for brand accounts, agency name for agency accounts. Null when
   * the profile hasn't been filled in or couldn't be read — the event still
   * fires, just without the breakdown.
   */
  accountName: string | null;
};

/**
 * How long a cached brand/agency profile counts as fresh when resolved for an
 * event. Long enough that a browsing session reads it once; the name is slow-
 * moving, so a stale read costs nothing.
 */
export const BUYER_PROFILE_STALE_MS = 5 * 60_000;

/** The marketplace prices in rupees, so every event's `value` is INR. */
const BUYER_CURRENCY = "INR";

/** The account breakdown attached to every buyer event. */
function buyerParams(identity: BuyerIdentity): Record<string, unknown> {
  return {
    account_type: identity.accountType,
    ...(identity.accountName ? { brand_name: identity.accountName } : {}),
  };
}

/**
 * Step 1 of the buyer funnel — the brand/agency opened the creator catalogue
 * ("Creators" in the navbar, i.e. /brand/creators or /agency/creators).
 *
 * Custom event: Meta has no standard event for browsing a marketplace. To
 * optimize a campaign on it, map it to a Custom Conversion in Events Manager.
 */
export function trackExploreCreators(identity: BuyerIdentity): boolean {
  return trackPixelCustom("ExploreCreators", buyerParams(identity), {
    audience: "brand",
  });
}

/**
 * How long a brand/agency has to stay on the creator catalogue before they
 * count as engaged. Browsing is the one funnel step with no click to measure,
 * so dwell time stands in for intent: a glance bounces, a real search doesn't.
 */
export const HOT_BRAND_SECONDS = 30;

/**
 * A brand/agency spent {@link HOT_BRAND_SECONDS} actually looking at the
 * creator catalogue — a "hot" buyer, worth its own audience.
 *
 * Deliberately an **event**, not a duration attached to `ExploreCreators`: Meta
 * optimizes on whether an event happened, and cannot read a `seconds` field, so
 * a threshold crossed is a usable signal where a number is only reporting.
 * Firing it from the live page rather than on exit is what makes it reliable —
 * a browser tearing down a tab drops in-flight beacons, and it drops the long
 * sessions first, which is exactly the population this is trying to find.
 *
 * Custom event, so optimizing a campaign on it needs a Custom Conversion;
 * building a Custom Audience from it needs nothing. `account_type` tells brands
 * and agencies apart — the name follows the funnel, not the account kind.
 */
export function trackHotBrand(identity: BuyerIdentity): boolean {
  return trackPixelCustom(
    "HotBrand",
    { ...buyerParams(identity), engaged_seconds: HOT_BRAND_SECONDS },
    { audience: "brand" },
  );
}

/**
 * Step 3 of the buyer funnel — the brand/agency opened a creator from the
 * catalogue, by the card's "View" button, the card itself, or the keyboard.
 *
 * Deep links (`?creatorId=`) deliberately do not count: the drawer opens there
 * without anyone choosing that creator from the grid.
 *
 * `ViewContent` is a Meta **standard** event. It carries the creator's starting
 * price as `value`, which is what a collab with them would open at — reporting
 * metadata, not a transaction.
 *
 * Browser-only: opening the drawer is pure client state, so there is no request
 * of ours for a server copy to hook into.
 */
export function trackViewCreator(
  identity: BuyerIdentity,
  creator: { creatorId: string; startingPrice?: number | null },
): boolean {
  const { startingPrice } = creator;
  return trackPixelEvent(
    "ViewContent",
    {
      ...buyerParams(identity),
      content_ids: [creator.creatorId],
      content_type: "product",
      ...(typeof startingPrice === "number" && startingPrice > 0
        ? { value: startingPrice, currency: BUYER_CURRENCY }
        : {}),
    },
    { audience: "brand" },
  );
}

/**
 * Step 4 of the buyer funnel — "Place order" clicked on a creator, opening the
 * order modal. The package and add-ons aren't chosen yet, so `value` is the
 * creator's starting price: what the order opens at, not what it will cost.
 *
 * `AddToCart` is Meta's standard event for picking out an item to buy, which is
 * exactly this step: the creator is chosen, the checkout is not yet configured.
 */
export function trackBeginCheckout(
  identity: BuyerIdentity,
  creator: { creatorId: string; startingPrice?: number | null },
): boolean {
  const { startingPrice } = creator;
  return trackPixelEvent(
    "AddToCart",
    {
      ...buyerParams(identity),
      content_ids: [creator.creatorId],
      content_type: "product",
      num_items: 1,
      ...(typeof startingPrice === "number" && startingPrice > 0
        ? { value: startingPrice, currency: BUYER_CURRENCY }
        : {}),
    },
    { audience: "brand" },
  );
}

/**
 * Step 5 of the buyer funnel — "Create checkout" clicked in the order modal,
 * handing off to payment. The order is fully configured by now, so `value` is
 * what the buyer actually owes: package + add-ons, less any coupon and credits.
 * It can legitimately be 0 (a free first order, or one fully covered by
 * credits) — the step still happened, so it is still reported.
 *
 * `InitiateCheckout` is Meta's standard event for entering checkout before
 * completing it.
 */
export function trackCheckoutInitiate(
  identity: BuyerIdentity,
  order: {
    creatorId: string;
    /** Net payable in rupees, after coupon and credits. */
    value: number;
    packageLabel?: string | null;
    addOnCount?: number;
    couponCode?: string | null;
  },
): boolean {
  return trackPixelEvent(
    "InitiateCheckout",
    {
      ...buyerParams(identity),
      content_ids: [order.creatorId],
      content_type: "product",
      num_items: 1,
      value: order.value,
      currency: BUYER_CURRENCY,
      ...(order.packageLabel ? { package_label: order.packageLabel } : {}),
      ...(order.addOnCount ? { add_on_count: order.addOnCount } : {}),
      ...(order.couponCode ? { coupon_code: order.couponCode } : {}),
    },
    { audience: "brand" },
  );
}

/**
 * Event id shared by this browser event and the server's Conversions API copy,
 * so Meta counts the pair once. Derived from the (wishlist, creator) pair,
 * which both sides know. Mirrors `addToWishlistEventId` in
 * `server/src/meta-capi/meta-capi.service.ts` — keep the two in step.
 */
export function addToWishlistEventId(
  wishlistId: string,
  creatorId: string,
): string {
  return `wishlist-add-${wishlistId}-${creatorId}`;
}

/**
 * Step 2 of the buyer funnel — a creator was saved to a wishlist, either into
 * an existing wishlist or into one created on the spot.
 *
 * `AddToWishlist` is a Meta **standard** event, so it is sent with
 * `trackSingle` and is available to ad delivery optimization directly, with no
 * Custom Conversion needed.
 *
 * The server sends the same event with the same id from the save request, so
 * an ad-blocked browser still converts and a working one is not double-counted.
 */
export function trackAddToWishlist(
  identity: BuyerIdentity,
  save: {
    wishlistId: string;
    creatorId: string;
    wishlistName?: string | null;
  },
): boolean {
  return trackPixelEvent(
    "AddToWishlist",
    {
      ...buyerParams(identity),
      content_ids: [save.creatorId],
      content_type: "product",
      ...(save.wishlistName ? { wishlist_name: save.wishlistName } : {}),
    },
    {
      audience: "brand",
      eventId: addToWishlistEventId(save.wishlistId, save.creatorId),
    },
  );
}
