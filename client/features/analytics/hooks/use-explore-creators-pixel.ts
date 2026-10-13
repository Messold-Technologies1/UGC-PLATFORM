"use client";

import { useEffect, useRef } from "react";

import { trackExploreCreators } from "../lib/buyer-pixel-events";
import { useBuyerIdentityResolver } from "./use-buyer-identity-resolver";

/**
 * The pixel loader runs with `afterInteractive`, so on a cold load `window.fbq`
 * can still be missing when the catalogue mounts. Retry briefly rather than
 * dropping the event; a page that never loads the pixel (tracking switched off,
 * ad-blocker) simply gives up after the last attempt.
 */
const PIXEL_RETRY_MS = 400;
const PIXEL_MAX_ATTEMPTS = 10;

/**
 * Fire `ExploreCreators` once per visit to the creator catalogue, tagged with
 * the acting brand/agency name.
 *
 * Mount-scoped rather than route-scoped: both /brand/creators and
 * /agency/creators mount `BrandCreatorsBrowser`, and filtering, searching or
 * paging within the catalogue does not remount it, so one visit sends one
 * event. Navigating away and back is a new visit, and sends a new one.
 */
export function useExploreCreatorsPixel(): void {
  const resolveIdentity = useBuyerIdentityResolver();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    let timer: number | undefined;

    void resolveIdentity().then((identity) => {
      let attempts = 0;
      const send = () => {
        if (cancelled || trackExploreCreators(identity)) return;
        attempts += 1;
        if (attempts >= PIXEL_MAX_ATTEMPTS) return;
        timer = window.setTimeout(send, PIXEL_RETRY_MS);
      };
      send();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [resolveIdentity]);
}
