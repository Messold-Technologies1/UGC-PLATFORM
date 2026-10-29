"use client";

import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/features/push/hooks/use-push-subscription";

/**
 * Browser notifications, as one row of the notification settings card.
 *
 * Its own component because it is the only channel with two gates rather than
 * one. Email and WhatsApp need a column flipped; push needs that *and* the
 * browser's permission, which belongs to one device and can only be asked for
 * from inside a real click. This row's switch is that click, which is the
 * whole reason there is no separate prompt anywhere in the app: the one
 * request this browser will ever grant is spent on someone who just asked for
 * it.
 *
 * On means both — this browser subscribed, and the account's column true. Off
 * means both too: muting here drops this browser's subscription and stops
 * push on the account's other devices. That is what "turn it off" reads as on
 * a settings screen, and a toggle that silenced only the laptop while the
 * phone kept buzzing would be the surprising one.
 *
 * The browser permission itself is deliberately left granted when switching
 * off. Revoking it is the user's to do in site settings, and dropping it here
 * would make a later re-enable spend a prompt this browser cannot get back.
 */
export function PushToggleRow({
  /** The account's column. Null while it is still loading. */
  enabledForAccount,
  onChange,
  saving,
}: {
  enabledForAccount: boolean | null;
  onChange: (enabled: boolean) => void;
  saving: boolean;
}) {
  const { state, subscribe, unsubscribe } = usePushSubscription();

  // Nothing to offer: the server has no VAPID keys, so a switch here could
  // never produce a notification.
  if (state === "unconfigured") return null;

  const unsupported = state === "unsupported";
  const denied = state === "denied";
  const busy = state === "working" || saving;
  const checked =
    state === "subscribed" && (enabledForAccount ?? false) && !denied;

  const note = unsupported
    ? "This browser does not support notifications."
    : denied
      ? "Blocked in your browser settings. Allow notifications for this site, then turn this on."
      : null;

  const handle = (next: boolean) => {
    void (async () => {
      if (next) {
        // The permission request has to happen inside this handler's call
        // stack to count as a user gesture. Only tell the server the account
        // wants push once the browser has actually agreed — otherwise the
        // column would say yes for an account with nothing to deliver to.
        if (await subscribe()) onChange(true);
        return;
      }
      await unsubscribe();
      onChange(false);
    })();
  };

  return (
    <div className="flex items-start gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Bell className="size-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <label htmlFor="notif-push" className="text-sm font-medium">
          Browser
        </label>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Alerts on this device when a message or order update arrives, even
          with the tab closed.
        </p>
        {note ? (
          <p className="mt-1 text-sm text-muted-foreground">{note}</p>
        ) : null}
      </div>

      {enabledForAccount === null ? (
        <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
      ) : (
        <Switch
          id="notif-push"
          checked={checked}
          disabled={busy || unsupported || denied}
          onCheckedChange={handle}
          aria-label="Browser notifications"
        />
      )}
    </div>
  );
}
