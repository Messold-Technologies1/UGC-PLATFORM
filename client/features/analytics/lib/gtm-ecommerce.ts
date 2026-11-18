/**
 * GA4 ecommerce events pushed to the Google Tag Manager `dataLayer`.
 *
 * Separate from `buyer-pixel-events.ts` on purpose: that file reports the
 * buyer funnel to Meta, this one reports the same three steps to GA4 through
 * the GTM container loaded in `app/layout.tsx`. The two are fired side by side
 * at each call site and neither depends on the other, so one being blocked
 * never costs the other its event.
 *
 * Everything here is a no-op when `window.dataLayer` is missing — GTM blocked
 * by an extension, or any server render — so callers never have to guard, the
 * same contract `lib/meta-pixel.ts` offers for `fbq`.
 *
 * An "item" is the creator: `item_id` is their id and `item_name` their
 * display name. The package is not modelled as a separate item, so an order is
 * always a single line of `quantity: 1`.
 */

/** The marketplace prices in rupees. */
const CURRENCY = "INR";

/** One GA4 ecommerce item — a creator being collaborated with. */
export type GtmItem = {
  /** The creator's id. */
  item_id: string;
  /** The creator's display name. */
  item_name: string;
  /**
   * Rupees. At `add_to_cart` this is the creator's starting price, since no
   * package has been chosen yet; later it is the real payable.
   */
  price: number;
  quantity: number;
};

type Ecommerce = {
  currency: string;
  value: number;
  items: GtmItem[];
  transaction_id?: string;
};

/**
 * Push one ecommerce event, preceded by the `ecommerce: null` reset.
 *
 * The reset is not optional: `dataLayer` is cumulative, so without it GA4
 * merges the previous event's `ecommerce` object into this one and a purchase
 * can inherit items from an earlier `add_to_cart`.
 *
 * Returns whether it was pushed, so a caller can tell "sent" from "GTM is not
 * here" rather than guessing from a silent void.
 */
function pushEcommerce(event: string, ecommerce: Ecommerce): boolean {
  if (typeof window === "undefined") return false;
  const dataLayer = window.dataLayer;
  if (!Array.isArray(dataLayer)) return false;
  try {
    dataLayer.push({ ecommerce: null });
    dataLayer.push({ event, ecommerce });
    return true;
  } catch {
    // A push must never take a checkout down with it.
    return false;
  }
}

/** One creator, as a single-line item list. */
function singleItem(creator: {
  creatorId: string;
  creatorName: string;
  price: number;
}): GtmItem[] {
  return [
    {
      item_id: creator.creatorId,
      item_name: creator.creatorName,
      price: creator.price,
      quantity: 1,
    },
  ];
}

/**
 * The order modal opened on a creator — the buyer has chosen who to work with.
 *
 * `price` is the creator's starting price, because no package is selected at
 * this point: it is what a collab with them opens at, not what it will cost.
 */
export function pushAddToCart(creator: {
  creatorId: string;
  creatorName: string;
  startingPrice: number;
}): boolean {
  const items = singleItem({
    creatorId: creator.creatorId,
    creatorName: creator.creatorName,
    price: creator.startingPrice,
  });
  return pushEcommerce("add_to_cart", {
    currency: CURRENCY,
    value: creator.startingPrice,
    items,
  });
}

/**
 * "Create checkout" clicked — the order is configured and handing off to
 * payment.
 *
 * `value` is the net payable after coupon and credits, which can legitimately
 * be 0 on a free first order or one fully covered by credits. The step still
 * happened, so it is still reported.
 */
export function pushBeginCheckout(order: {
  creatorId: string;
  creatorName: string;
  value: number;
}): boolean {
  return pushEcommerce("begin_checkout", {
    currency: CURRENCY,
    value: order.value,
    items: singleItem({
      creatorId: order.creatorId,
      creatorName: order.creatorName,
      price: order.value,
    }),
  });
}

/**
 * Orders already reported as purchased in this tab.
 *
 * GA4 drops a repeated `transaction_id`, but only within one session and only
 * after it has already been counted once — so the guard is here as well. The
 * paths that can revisit a paid order (resuming a checkout, re-entering the
 * flow) would otherwise each fire their own copy.
 */
const PURCHASED_KEY = "gtm:purchased-orders";

function alreadyPurchased(orderId: string): boolean {
  try {
    const raw = window.sessionStorage.getItem(PURCHASED_KEY);
    return raw ? (JSON.parse(raw) as string[]).includes(orderId) : false;
  } catch {
    // Private mode, blocked storage, or a corrupted value: fall through and
    // report. A duplicated purchase is a smaller problem than a missing one.
    return false;
  }
}

function rememberPurchased(orderId: string): void {
  try {
    const raw = window.sessionStorage.getItem(PURCHASED_KEY);
    const seen = raw ? (JSON.parse(raw) as string[]) : [];
    seen.push(orderId);
    window.sessionStorage.setItem(PURCHASED_KEY, JSON.stringify(seen));
  } catch {
    // Non-fatal: the GA4-side dedupe on transaction_id still applies.
  }
}

/**
 * Payment succeeded — the only one of the three that carries money.
 *
 * Fired from the browser because `dataLayer` has no server-side equivalent.
 * That makes it optimistic by a moment: the server treats an order as
 * purchased when the Razorpay webhook lands it at BRIEF_SUBMISSION_PENDING
 * with a `paidAt` (see `firePurchaseMetaEvent` in orders.service.ts), whereas
 * this fires as soon as the gateway's own handler reports success. A payment
 * that passes at the gateway but fails verification will therefore have fired
 * a `purchase` the backend never counts.
 *
 * Call it BEFORE redirecting: the redirect is a `router.replace`, and a push
 * racing a navigation is a push that may not arrive.
 */
export function pushPurchase(order: {
  orderId: string;
  creatorId: string;
  creatorName: string;
  value: number;
}): boolean {
  if (typeof window === "undefined") return false;
  if (alreadyPurchased(order.orderId)) return false;
  const pushed = pushEcommerce("purchase", {
    transaction_id: order.orderId,
    currency: CURRENCY,
    value: order.value,
    items: singleItem({
      creatorId: order.creatorId,
      creatorName: order.creatorName,
      price: order.value,
    }),
  });
  if (pushed) rememberPurchased(order.orderId);
  return pushed;
}
