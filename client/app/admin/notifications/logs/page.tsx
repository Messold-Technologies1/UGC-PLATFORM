"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsBackLink } from "@/features/notifications/components/back-link";
import { DeliveryLogTable } from "@/features/notifications/components/delivery-log-table";
import { EventLogPicker } from "@/features/notifications/components/event-log-picker";
import { useNotificationEventsQuery } from "@/features/notifications/hooks/use-notifications";

/** Selected view: the card grid, one event, or every delivery unfiltered. */
type View = { kind: "events" } | { kind: "event"; key: string } | { kind: "all" };

export default function NotificationLogsPage() {
  const [view, setView] = useState<View>({ kind: "events" });
  // Only to title the drilled-in view; the picker has already loaded this, so
  // it is served from cache rather than fetched again.
  const { data: events } = useNotificationEventsQuery(view.kind === "event");

  const selected =
    view.kind === "event"
      ? events?.find((event) => event.key === view.key)
      : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {view.kind === "events" ? (
        <>
          {/* One back affordance per level: from the grid you leave the log
              entirely, from an event you step back to the grid. */}
          <NotificationsBackLink />
          <header>
            <h1 className="text-2xl font-semibold">Delivery log</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Every send and every deliberate skip, with the reason — so “why
              didn’t they get it?” is answerable here. Pick an event to see its
              deliveries.
            </p>
          </header>
          <EventLogPicker
            onSelect={(key) => setView({ kind: "event", key })}
            onViewAll={() => setView({ kind: "all" })}
          />
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground -ml-2 h-auto p-2"
            onClick={() => setView({ kind: "events" })}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            All events
          </Button>

          <DeliveryLogTable
            // Remount on change so filters and paging start clean for the new
            // event rather than carrying over a cursor into a different set.
            key={view.kind === "event" ? view.key : "__all"}
            lockedEventKey={view.kind === "event" ? view.key : undefined}
            heading={
              <div>
                <h1 className="text-2xl font-semibold">
                  {view.kind === "all"
                    ? "Every delivery"
                    : (selected?.label ?? view.key)}
                </h1>
                {view.kind === "event" ? (
                  <p className="text-muted-foreground mt-1 font-mono text-xs">
                    {view.key}
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-1 text-sm">
                    Every send and every deliberate skip, across all events.
                  </p>
                )}
                {selected?.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {selected.description}
                  </p>
                )}
              </div>
            }
          />
        </>
      )}
    </div>
  );
}
