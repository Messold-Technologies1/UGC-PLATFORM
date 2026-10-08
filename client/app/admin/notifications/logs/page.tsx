"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

/** The API caps `take` at 200, so these all round-trip as asked. */
const PAGE_SIZES = [25, 50, 100] as const;

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

  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  /**
   * One cursor per page visited, so "previous" can go back.
   *
   * The API pages by cursor rather than offset — it hands back the id to
   * resume from — which is what keeps paging stable while rows are still being
   * written at the top. An offset would quietly shift every page down by one
   * each time a send happens mid-browse, showing the same row twice.
   */
  const [cursors, setCursors] = useState<string[]>([]);
  const pageIndex = cursors.length;

  const query = {
    eventKey: eventKey.trim() || undefined,
    status: status || undefined,
    channel: channel || undefined,
    cursor: cursors[cursors.length - 1],
    take: pageSize,
  };

  const { data, isLoading, isFetching } = useNotificationLogsQuery(query);
  // Rows arrive as they are written. Delivered and bounced come back from the
  // provider minutes after the send, which is exactly when nobody is still
  // sitting here pressing refresh.
  const { live, received } = useNotificationLogFeed(query);

  /**
   * Every control that changes the result set goes through here.
   *
   * A cursor is an id to resume from inside one particular result set, so the
   * moment the filters or the page size change it points into a list that no
   * longer exists — paging has to start again from the top. Doing that in the
   * handler rather than in an effect keeps it a single render, and makes it
   * obvious that the reset is caused by the click, not synced after it.
   */
  const onFirstPage = cursors.length === 0;
  function change<T>(set: (v: T) => void) {
    return (value: T) => {
      set(value);
      setCursors([]);
    };
  }

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
          {received > 0 &&
            (onFirstPage
              ? ` · ${received} new`
              : ` · ${received} new on page 1`)}
        </span>
      </header>

      <div className="flex flex-wrap gap-3">
        <Input
          className="w-72"
          placeholder="Filter by event key"
          value={eventKey}
          onChange={(e) => change(setEventKey)(e.target.value)}
        />
        <Select
          value={status || "__all"}
          onValueChange={(v) => change(setStatus)(v === "__all" ? "" : v)}
        >
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
          onValueChange={(v) => change(setChannel)(v === "__all" ? "" : v)}
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
        <Select
          value={String(pageSize)}
          onValueChange={(v) => change(setPageSize)(Number(v))}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} per page
              </SelectItem>
            ))}
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
                      <span className="block text-red-600">
                        {row.errorMessage}
                      </span>
                    )}
                    {row.renderedSubject && (
                      <span className="block truncate">
                        {row.renderedSubject}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-muted-foreground p-8 text-center"
                  >
                    {onFirstPage
                      ? "Nothing logged yet for this filter."
                      : "No more rows."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && (data?.items.length || !onFirstPage) ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            Page {pageIndex + 1}
            {data?.items.length ? ` · ${data.items.length} rows` : ""}
            {isFetching && " · loading…"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={onFirstPage || isFetching}
              onClick={() => setCursors((c) => c.slice(0, -1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              // nextCursor is null on the last page, which is how the API says
              // there is nothing after this one — no count query needed.
              disabled={!data?.nextCursor || isFetching}
              onClick={() =>
                setCursors((c) =>
                  data?.nextCursor ? [...c, data.nextCursor] : c,
                )
              }
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
