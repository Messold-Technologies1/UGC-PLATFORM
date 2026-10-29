"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deletePushSubscription,
  fetchPushConfig,
  savePushSubscription,
} from "../api/push";
import {
  canRequestPermission,
  pushSupported,
  urlBase64ToApplicationServerKey,
} from "../lib/push-support";

/** Where this browser stands, as far as the toggle needs to know. */
export type PushState =
  /** No service worker or no PushManager: nothing to offer. */
  | "unsupported"
  /** The server has no VAPID keys, so asking would be pointless. */
  | "unconfigured"
  /** Asked and refused. Terminal — only site settings can undo it. */
  | "denied"
  | "subscribed"
  | "unsubscribed"
  | "working";

const SW_PATH = "/sw.js";

async function register(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

/**
 * Drives one browser's push subscription for the settings toggle.
 *
 * The browser permission is the real opt-in and it can only be asked for from
 * a user gesture, so everything here is kicked off by `subscribe()` running
 * inside the toggle's own click. Nothing prompts on mount — a permission
 * prompt fired on page load is ignored outright by Firefox and Safari, and a
 * refusal cannot be asked for a second time.
 *
 * On mount it only *reads*: a subscription this browser already has is
 * re-sent to the server, because Chrome drops subscriptions after long
 * inactivity and a user whose subscription silently expired looks exactly
 * like one who never subscribed.
 */
export function usePushSubscription(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const [state, setState] = useState<PushState>("working");
  const publicKeyRef = useRef<string | null>(null);

  const readConfig = useCallback(async (): Promise<string | null> => {
    if (publicKeyRef.current) return publicKeyRef.current;
    const config = await fetchPushConfig();
    publicKeyRef.current =
      config.configured && config.publicKey ? config.publicKey : null;
    return publicKeyRef.current;
  }, []);

  // Reconcile on mount. Deliberately silent: it never prompts, so it is safe
  // to run on every page that shows the toggle.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void (async () => {
      if (!pushSupported()) {
        if (!cancelled) setState("unsupported");
        return;
      }
      try {
        const publicKey = await readConfig();
        if (cancelled) return;
        if (!publicKey) {
          setState("unconfigured");
          return;
        }
        if (Notification.permission === "denied") {
          setState("denied");
          return;
        }

        const registration = await register();
        const subscription =
          await registration.pushManager.getSubscription();
        if (cancelled) return;

        if (!subscription) {
          setState("unsubscribed");
          return;
        }

        // Re-send what we already have. The server upserts on the endpoint, so
        // this is free when nothing changed and is the only thing that
        // recovers a subscription the server lost or never received.
        await savePushSubscription(subscription);
        if (!cancelled) setState("subscribed");
      } catch {
        // A failed reconcile must not make the toggle unusable: present as
        // "off" so the user can still turn it on, which re-runs all of this.
        if (!cancelled) setState("unsubscribed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, readConfig]);

  /**
   * Must be called from a user gesture — the browser rejects the permission
   * request otherwise.
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!canRequestPermission()) {
      setState(pushSupported() ? "denied" : "unsupported");
      return false;
    }
    setState("working");
    try {
      const publicKey = await readConfig();
      if (!publicKey) {
        setState("unconfigured");
        return false;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "unsubscribed");
        return false;
      }

      const registration = await register();
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          // Required to be true by every browser that implements push: a
          // subscription that could deliver silently is not permitted.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToApplicationServerKey(publicKey),
        }));

      await savePushSubscription(subscription);
      setState("subscribed");
      return true;
    } catch {
      setState("unsubscribed");
      return false;
    }
  }, [readConfig]);

  /**
   * Forget this browser.
   *
   * The browser permission is deliberately left granted: revoking it is the
   * user's to do in site settings, and dropping it here would mean a later
   * re-enable has to spend the one prompt this browser still has.
   */
  const unsubscribe = useCallback(async (): Promise<void> => {
    setState("working");
    try {
      const registration = await navigator.serviceWorker.getRegistration(
        SW_PATH,
      );
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const { endpoint } = subscription;
        await subscription.unsubscribe().catch(() => undefined);
        await deletePushSubscription(endpoint);
      }
    } catch {
      // Falls through: the server prunes a stale endpoint on its next send.
    }
    setState("unsubscribed");
  }, []);

  return { state, subscribe, unsubscribe };
}
