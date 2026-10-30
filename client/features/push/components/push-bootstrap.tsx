"use client";

import { usePushSubscription } from "@/features/push/hooks/use-push-subscription";
import { useAuth } from "@/providers/auth-provider";

/**
 * Keeps this browser subscribed, on every authenticated page.
 *
 * Renders nothing. It exists because the hook used to run only where the
 * settings toggle was mounted, so a browser whose subscription the browser had
 * dropped stayed silent until its owner happened to open settings — and an
 * account signing in on a browser that had already granted permission got
 * nothing at all until it did the same.
 *
 * It also raises the browser's permission prompt, once per tab session, for
 * an account that has not answered yet — which is what puts notifications in
 * front of people who would never find the settings toggle.
 *
 * The cost is real and was chosen deliberately: a prompt nobody asked for is
 * refused more often than one behind an in-app "Enable" button, a refusal is
 * permanent, and Firefox and Safari ignore a request with no user gesture
 * behind it, so it reaches Chrome first and foremost. The toggle remains the
 * way back for anyone who said no in a browser that still allows it.
 */
export function PushBootstrap() {
  const { isAuthenticated } = useAuth();
  // Waits for the session. Saving a subscription needs an authenticated
  // request, and running before auth resolves would spend the attempt on a
  // 401 that nothing retries.
  usePushSubscription({ enabled: isAuthenticated, autoPrompt: true });
  return null;
}
