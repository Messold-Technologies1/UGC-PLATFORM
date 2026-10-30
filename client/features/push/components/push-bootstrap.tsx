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
 * It never prompts. The hook only creates a subscription when permission is
 * already "granted", which makes subscribe() silent; a browser that has not
 * been asked is left alone for the toggle to ask properly, from a real click.
 */
export function PushBootstrap() {
  const { isAuthenticated } = useAuth();
  // Waits for the session. Saving a subscription needs an authenticated
  // request, and running before auth resolves would spend the attempt on a
  // 401 that nothing retries.
  usePushSubscription({ enabled: isAuthenticated });
  return null;
}
