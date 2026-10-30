"use client";

import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/features/push/hooks/use-push-subscription";

/**
 * Browser notifications for an admin.
 *
 * Separate from the workspace notification card because an admin has no
 * creator, brand or agency profile — that card reads the per-profile opt-in
 * columns and 404s for an account that has none. For an admin there is no
 * account column at all: the subscription IS the setting, which is why this
 * one has nothing to save.
 *
 * What it turns on is the dispute chat. Support is notified about messages on
 * a disputed order, and only while the dispute is open.
 */
export function AdminPushCard() {
  const { state, subscribe, unsubscribe } = usePushSubscription();

  // No VAPID keys on this environment: a switch here could never produce a
  // notification, so offering one would only mislead.
  if (state === "unconfigured") return null;

  const unsupported = state === "unsupported";
  const denied = state === "denied";
  const note = unsupported
    ? "This browser does not support notifications."
    : denied
      ? "Blocked in your browser settings. Allow notifications for this site, then turn this on."
      : null;

  return (
    <div className="flex items-start gap-4 rounded-xl border p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Bell className="size-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Browser notifications</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Alerts on this device when someone posts in a disputed order&apos;s
          chat, even with the tab closed.
        </p>
        {note ? (
          <p className="mt-1 text-sm text-muted-foreground">{note}</p>
        ) : null}
      </div>

      <Switch
        checked={state === "subscribed"}
        disabled={state === "working" || unsupported || denied}
        // The permission request has to run inside this handler to count as a
        // user gesture, which is why there is no prompt anywhere else.
        onCheckedChange={(next) => {
          void (next ? subscribe() : unsubscribe());
        }}
        aria-label="Browser notifications"
      />
    </div>
  );
}
