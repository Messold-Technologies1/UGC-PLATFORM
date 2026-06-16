/** Blocks ReelCard → ProfileDrawer opens while wishlist overlays are active or just closed. */

let suppressUntil = 0;
let openWishlistOverlayCount = 0;

const SUPPRESS_AFTER_CLOSE_MS = 1200;

export function registerWishlistOverlayOpen() {
  openWishlistOverlayCount += 1;
}

export function registerWishlistOverlayClose() {
  openWishlistOverlayCount = Math.max(0, openWishlistOverlayCount - 1);
  suppressUntil = Date.now() + SUPPRESS_AFTER_CLOSE_MS;
}

export function extendCreatorCardNavigationSuppress(
  ms = SUPPRESS_AFTER_CLOSE_MS,
) {
  suppressUntil = Math.max(suppressUntil, Date.now() + ms);
}

function isModalOpenInDom(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      '[data-slot="dialog-content"][data-state="open"], [data-slot="dialog-overlay"][data-state="open"]',
    ),
  );
}

export function shouldSuppressCreatorCardNavigation(): boolean {
  if (openWishlistOverlayCount > 0) return true;
  if (Date.now() < suppressUntil) return true;
  return isModalOpenInDom();
}
