"use client";

import { useEffect, useRef } from "react";

import {
  HOT_BRAND_SECONDS,
  trackExploreCreators,
  trackHotBrand,
  type BuyerIdentity,
} from "../lib/buyer-pixel-events";
import { useBuyerIdentityResolver } from "./use-buyer-identity-resolver";

/**
 * The pixel loader runs with `afterInteractive`, so on a cold load `window.fbq`
 * can still be missing when the catalogue mounts. Retry briefly rather than
 * dropping the event; a page that never loads the pixel (tracking switched off,
 * ad-blocker) simply gives up after the last attempt.
 */
const PIXEL_RETRY_MS = 400;
const PIXEL_MAX_ATTEMPTS = 10;

/** How often the dwell timer wakes to count another second of attention. */
const DWELL_TICK_MS = 1000;

/**
 * Hand an event to the pixel, retrying briefly while `fbq` is still loading.
 * Returns a cancel function so a component that unmounts stops trying.
 */
function sendWithRetry(send: () => boolean): () => void {
  let attempts = 0;
  let cancelled = false;
  let timer: number | undefined;
  const attempt = () => {
    if (cancelled || send()) return;
    attempts += 1;
    if (attempts >= PIXEL_MAX_ATTEMPTS) return;
    timer = window.setTimeout(attempt, PIXEL_RETRY_MS);
  };
  attempt();
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

/**
 * Count seconds the catalogue is actually being looked at and, once
 * {@link HOT_BRAND_SECONDS} of them have passed, mark this buyer hot.
 *
 * Only visible seconds count. A tab left open behind another window would
 * otherwise mark every visitor hot overnight, which would make the signal mean
 * nothing. Browsers also throttle timers in background tabs, so skipping those
 * ticks is both the honest reading and the one the platform can deliver.
 *
 * Returns a cancel function: leaving before the threshold sends nothing.
 */
function startDwellTimer(identity: BuyerIdentity): () => void {
  let activeSeconds = 0;
  let cancelSend: (() => void) | undefined;
  const tick = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    activeSeconds += 1;
    if (activeSeconds < HOT_BRAND_SECONDS) return;
    window.clearInterval(tick);
    cancelSend = sendWithRetry(() => trackHotBrand(identity));
  }, DWELL_TICK_MS);

  return () => {
    window.clearInterval(tick);
    cancelSend?.();
  };
}

/**
 * Report the creator catalogue to the brand dataset, tagged with the acting
 * brand/agency name: `ExploreCreators` on arrival, and `HotBrand` once they
 * have spent {@link HOT_BRAND_SECONDS} actually looking at it.
 *
 * Mount-scoped rather than route-scoped: both /brand/creators and
 * /agency/creators mount `BrandCreatorsBrowser`, and filtering, searching or
 * paging within the catalogue does not remount it, so one visit sends one of
 * each at most. Navigating away and back is a new visit — a buyer who keeps
 * coming back to browse is, reasonably, hot again.
 */
export function useExploreCreatorsPixel(): void {
  const resolveIdentity = useBuyerIdentityResolver();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    void resolveIdentity().then((identity) => {
      // Nothing to report for a signed-out viewer, and nothing to start if the
      // catalogue was already left while the identity was resolving.
      if (cancelled || !identity) return;
      cleanups.push(sendWithRetry(() => trackExploreCreators(identity)));
      cleanups.push(startDwellTimer(identity));
    });

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, [resolveIdentity]);
}
