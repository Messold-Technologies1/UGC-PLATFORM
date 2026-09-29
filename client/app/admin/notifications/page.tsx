"use client";

import Link from "next/link";
import { Bell, FileText, ScrollText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNotificationEventsQuery } from "@/features/notifications/hooks/use-notifications";
import { formatOffset } from "@/features/notifications/types";

export default function NotificationsHomePage() {
  const { data: events, isLoading } = useNotificationEventsQuery();

  const active = events?.filter((e) => e.isActive).length ?? 0;
  const configured = events?.filter((e) => e.scheduleCount > 0).length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Events are defined in code. Everything else — which templates they use,
          which channels, and when — is configured here.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/notifications/events"
          className="hover:border-primary rounded-lg border p-5 transition-colors"
        >
          <Bell className="text-muted-foreground mb-2 h-5 w-5" />
          <h2 className="font-medium">Events</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {isLoading ? "…" : `${active} active, ${configured} with a schedule`}
          </p>
        </Link>
        <Link
          href="/admin/notifications/templates"
          className="hover:border-primary rounded-lg border p-5 transition-colors"
        >
          <FileText className="text-muted-foreground mb-2 h-5 w-5" />
          <h2 className="font-medium">Templates</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Email copy, with version history
          </p>
        </Link>
        <Link
          href="/admin/notifications/logs"
          className="hover:border-primary rounded-lg border p-5 transition-colors"
        >
          <ScrollText className="text-muted-foreground mb-2 h-5 w-5" />
          <h2 className="font-medium">Delivery log</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Every send, and every deliberate skip
          </p>
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium">Recently configured</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {events
              ?.filter((e) => e.scheduleCount > 0)
              .slice(0, 8)
              .map((event) => (
                <li key={event.key}>
                  <Link
                    href={`/admin/notifications/events/${encodeURIComponent(event.key)}`}
                    className="hover:bg-muted/50 flex items-center justify-between gap-4 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{event.label}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {event.key}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {event.schedule.map((row) => (
                        <Badge key={row.offsetMinutes} variant="secondary">
                          {formatOffset(row.offsetMinutes)}
                        </Badge>
                      ))}
                      {!event.isActive && <Badge variant="outline">Off</Badge>}
                    </div>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
