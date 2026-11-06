"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ListFilter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNotificationEventsQuery } from "../hooks/use-notifications";
import { formatOffset } from "../types";
import type { NotificationEventSummary } from "../types";

/** Channels an event can actually reach, derived from what it has configured. */
function channelsFor(event: NotificationEventSummary): string[] {
  const channels: string[] = [];
  if (event.emailTemplate) channels.push("Email");
  if (event.whatsappTemplateName) channels.push("WhatsApp");
  // A schedule row can carry PUSH without a template of its own.
  if (event.schedule.some((row) => row.channels?.includes("PUSH"))) {
    channels.push("Browser");
  }
  return channels;
}

type EventLogPickerProps = {
  onSelect: (eventKey: string) => void;
  onViewAll: () => void;
};

/**
 * Entry point for the delivery log: one card per catalog event.
 *
 * The flat log answers "what happened just now", but not "is THIS event
 * behaving". Choosing the event first makes the second question the default,
 * and the whole catalog is listed — including events that have never fired, so
 * one that is silently never firing is visible rather than simply absent.
 *
 * Cards carry no send counts: there is no endpoint that aggregates them, and
 * the log API is cursor-paginated, so any number here would be a guess.
 */
export function EventLogPicker({ onSelect, onViewAll }: EventLogPickerProps) {
  const { data: events, isLoading } = useNotificationEventsQuery();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = events ?? [];
    if (!term) return rows;
    return rows.filter(
      (event) =>
        event.label.toLowerCase().includes(term) ||
        event.key.toLowerCase().includes(term) ||
        (event.description ?? "").toLowerCase().includes(term),
    );
  }, [events, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-80 max-w-full">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={onViewAll}>
          <ListFilter className="mr-1.5 size-4" />
          View every delivery
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border p-8 text-center text-sm">
          No event matches “{search}”.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => {
            const channels = channelsFor(event);
            const dormant = !event.isActive || event.deprecated;
            return (
              <button
                key={event.key}
                type="button"
                onClick={() => onSelect(event.key)}
                className={cn(
                  "group flex h-full flex-col gap-2 rounded-lg border p-4 text-left transition",
                  "hover:border-primary/50 hover:shadow-md hover:shadow-primary/5",
                  dormant && "bg-muted/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{event.label}</span>
                  <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0 transition group-hover:translate-x-0.5" />
                </div>

                <code className="text-muted-foreground truncate font-mono text-xs">
                  {event.key}
                </code>

                {event.description && (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {event.description}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="muted">
                    {event.recipient.toLowerCase()}
                  </Badge>
                  {channels.map((channel) => (
                    <Badge key={channel} variant="secondary">
                      {channel}
                    </Badge>
                  ))}
                  {event.deprecated ? (
                    <Badge variant="outline">deprecated</Badge>
                  ) : !event.isActive ? (
                    <Badge variant="outline">off</Badge>
                  ) : null}
                </div>

                {event.scheduleCount > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {event.scheduleCount} send
                    {event.scheduleCount === 1 ? "" : "s"}
                    {event.schedule.length > 0 &&
                      ` · ${event.schedule
                        .map((row) => formatOffset(row.offsetMinutes))
                        .join(", ")}`}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
