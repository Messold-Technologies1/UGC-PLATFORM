"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationEventsQuery } from "@/features/notifications/hooks/use-notifications";
import { formatOffset } from "@/features/notifications/types";
import { NotificationsBackLink } from "@/features/notifications/components/back-link";

export default function NotificationEventsPage() {
  const { data: events, isLoading } = useNotificationEventsQuery();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events ?? [];
    return (events ?? []).filter(
      (e) =>
        e.key.toLowerCase().includes(q) || e.label.toLowerCase().includes(q),
    );
  }, [events, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <NotificationsBackLink />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Each event is a moment in the product. Pick its templates, channels
            and timing.
          </p>
        </div>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
          <Input
            className="w-72 pl-9"
            placeholder="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {filtered.map((event) => (
            <li key={event.key}>
              <Link
                href={`/admin/notifications/events/${encodeURIComponent(event.key)}`}
                className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{event.label}</p>
                    <Badge variant="outline" className="text-xs">
                      {event.recipient.toLowerCase()}
                    </Badge>
                    {!event.isActive && <Badge variant="outline">Off</Badge>}
                    {event.deprecated && (
                      <Badge variant="outline">No longer in code</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                    {event.key}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {event.schedule.length === 0 ? (
                    <span className="text-muted-foreground text-xs">
                      No sends configured
                    </span>
                  ) : (
                    event.schedule.map((row) => (
                      <Badge
                        key={row.offsetMinutes}
                        variant={row.isActive ? "secondary" : "outline"}
                      >
                        {formatOffset(row.offsetMinutes)} ·{" "}
                        {row.channels
                          .map((c) => (c === "EMAIL" ? "mail" : "wa"))
                          .join(" + ") || "none"}
                      </Badge>
                    ))
                  )}
                </div>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="text-muted-foreground p-6 text-center text-sm">
              No events match “{search}”.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
