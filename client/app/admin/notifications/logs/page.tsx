"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationLogsQuery } from "@/features/notifications/hooks/use-notifications";
import { useNotificationLogFeed } from "@/features/notifications/hooks/use-notification-log-feed";
import { NotificationsBackLink } from "@/features/notifications/components/back-link";
import {
  formatOffset,
  type NotificationLogStatus,
} from "@/features/notifications/types";

const STATUSES: NotificationLogStatus[] = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "SKIPPED",
  "BOUNCED",
  "COMPLAINED",
];

/** Muted for the expected outcomes, outline for the ones worth looking at. */
function statusVariant(
  status: NotificationLogStatus,
): "default" | "secondary" | "outline" | "muted" {
  if (status === "DELIVERED" || status === "READ") return "default";
  if (status === "SENT") return "secondary";
  if (status === "SKIPPED" || status === "QUEUED") return "muted";
  return "outline";
}

export default function NotificationLogsPage() {
  const [eventKey, setEventKey] = useState("");
  const [status, setStatus] = useState<string>("");
  const [channel, setChannel] = useState<string>("");

  const filters = {
    eventKey: eventKey.trim() || undefined,
    status: status || undefined,
    channel: channel || undefined,
  };

  const { data, isLoading } = useNotificationLogsQuery(filters);
  // Rows arrive as they are written. Delivered and bounced come back from the
  // provider minutes after the send, which is exactly when nobody is still
  // sitting here pressing refresh.
  const { live, received } = useNotificationLogFeed(filters);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <NotificationsBackLink />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Delivery log</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every send and every deliberate skip, with the reason — so “why
            didn’t they get it?” is answerable here.
          </p>
        </div>
        <span
          className="text-muted-foreground flex items-center gap-2 text-xs"
          title={
            live
              ? "New rows appear here as they are written."
              : "Not connected — reload to see new rows."
          }
        >
          <span
            className={`h-2 w-2 rounded-full ${
              live ? "animate-pulse bg-green-500" : "bg-neutral-300"
            }`}
          />
          {live ? "Live" : "Offline"}
          {received > 0 && ` · ${received} new`}
        </span>
      </header>

      <div className="flex flex-wrap gap-3">
        <Input
          className="w-72"
          placeholder="Filter by event key"
          value={eventKey}
          onChange={(e) => setEventKey(e.target.value)}
        />
        <Select value={status || "__all"} onValueChange={(v) => setStatus(v === "__all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Any status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={channel || "__all"}
          onValueChange={(v) => setChannel(v === "__all" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Any channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Any channel</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">When</th>
                <th className="p-3 font-medium">Event</th>
                <th className="p-3 font-medium">Send</th>
                <th className="p-3 font-medium">To</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.items.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="text-muted-foreground p-3 whitespace-nowrap">
                    {new Date(row.queuedAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <p className="font-mono text-xs">{row.eventKey}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {row.entityId}
                    </p>
                  </td>
                  <td className="text-muted-foreground p-3 whitespace-nowrap text-xs">
                    {formatOffset(row.offsetMinutes)}
                    <br />
                    {row.channel === "EMAIL" ? "email" : "whatsapp"}
                  </td>
                  <td className="p-3 text-xs">{row.toAddress}</td>
                  <td className="p-3">
                    <Badge variant={statusVariant(row.status)}>
                      {row.status.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground max-w-xs p-3 text-xs">
                    {row.skippedReason && (
                      <span className="block">
                        Skipped: {row.skippedReason.replace(/_/g, " ")}
                      </span>
                    )}
                    {row.errorMessage && (
                      <span className="block text-red-600">{row.errorMessage}</span>
                    )}
                    {row.renderedSubject && (
                      <span className="block truncate">{row.renderedSubject}</span>
                    )}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted-foreground p-8 text-center">
                    Nothing logged yet for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
