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

/** Marks that this tab has already put the browser's prompt up. */
const AUTO_PROMPT_KEY = "push-auto-prompted";

/**
 * Whether to raise the permission prompt unasked on this load.
 *
 * Once per tab session, not once per render and not once per navigation.
 * Chrome treats three dismissals as a block, so a prompt that reappears on
 * every page view does not persuade anybody — it spends the account's only
 * chance and then takes the decision out of their hands. A session is a
 * reasonable stand-in for "they just signed in", without nagging someone who
 * is simply reloading.
 *
 * sessionStorage can throw in a private window, and a browser that will not
 * remember we asked is one we should not ask repeatedly, so a failure here
 * means no.
 */
function shouldAutoPrompt(): boolean {
  if (Notification.permission !== "default") return false;
  try {
    return window.sessionStorage.getItem(AUTO_PROMPT_KEY) === null;
  } catch {
    return false;
  }
}

function markAutoPrompted(): void {
  try {
    window.sessionStorage.setItem(AUTO_PROMPT_KEY, "1");
  } catch {
    // Nothing to do; shouldAutoPrompt already refuses when storage is absent.
  }
}

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
 * On mount it re-sends a subscription this browser already has, and creates
 * one that is missing while permission is already granted — subscribe() is
 * silent once the answer is "granted", so that path costs the user nothing.
 * Saying yes once therefore covers every later account on that browser and
 * every dropped subscription, without asking twice.
 *
 * With `autoPrompt` it will also raise the browser's prompt, once per tab
 * session, for a browser that has not answered yet. Only the app-wide
 * bootstrap sets it; the settings toggle does not, because there the click
 * is the request.
 */
export function usePushSubscription(
  options: { enabled?: boolean; autoPrompt?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const autoPrompt = options.autoPrompt ?? false;
  const [state, setState] = useState<PushState>("working");
  const publicKeyRef = useRef<string | null>(null);

  const readConfig = useCallback(async (): Promise<string | null> => {
    if (publicKeyRef.current) return publicKeyRef.current;
    const config = await fetchPushConfig();
    publicKeyRef.current =
      config.configured && config.publicKey ? config.publicKey : null;
    return publicKeyRef.current;
  }, []);

  // Reconcile on mount. Silent unless `autoPrompt` is set, in which case it
  // may raise the browser's permission prompt once per tab session.
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
        let subscription = await registration.pushManager.getSubscription();
        if (cancelled) return;

        if (!subscription) {
          // No subscription. If permission is already granted this is the
          // silent case — the browser dropped the subscription (Chrome does,
          // after long inactivity) or this account has never had one on a
          // browser that already said yes — and subscribe() below creates one
          // without asking anybody anything.
          //
          // That silent path is what makes push on by default: a person says
          // yes once, and every account they use in that browser is
          // subscribed from then on, on whatever page they open.
          if (Notification.permission !== "granted") {
            // Still unanswered, and this surface is allowed to ask: put the
            // browser's own prompt up once per session. See shouldAutoPrompt
            // for why it is once and not every render.
            if (autoPrompt && shouldAutoPrompt()) {
              markAutoPrompted();
              const granted = await Notification.requestPermission();
              if (cancelled) return;
              if (granted !== "granted") {
                setState(granted === "denied" ? "denied" : "unsubscribed");
                return;
              }
            } else {
              setState("unsubscribed");
              return;
            }
          }
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToApplicationServerKey(publicKey),
          });
          if (cancelled) return;
        }

        // Re-send what we have. The server upserts on the endpoint, so this is
        // free when nothing changed and is the only thing that recovers a
        // subscription the server lost or never received.
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
  }, [enabled, autoPrompt, readConfig]);

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
