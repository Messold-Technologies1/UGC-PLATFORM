"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";
import type { NotificationLogEvent } from "@/lib/realtime-events";
import type {
  NotificationLogEntry,
  NotificationLogPage,
} from "@/features/notifications/types";
import { notificationKeys } from "./use-notifications";

export type LogFeedFilters = {
  eventKey?: string;
  status?: string;
  channel?: string;
};

/**
 * Keeps the delivery log current without a refresh.
 *
 * Rows arrive as they are written, which matters most for the states nobody
 * would sit and wait for: a send goes QUEUED → SENT immediately, but DELIVERED
 * and BOUNCED come back from the provider minutes later, long after anyone has
 * stopped looking.
 *
 * A pushed row is written straight into the query cache rather than triggering
 * a refetch — the payload is already the full row, so a round trip would only
 * add latency and load for the same answer. Rows that do not match the filters
 * on screen are dropped, so what the feed adds can never contradict what the
 * filters say.
 */
export function useNotificationLogFeed(filters: LogFeedFilters): {
  live: boolean;
  received: number;
} {
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);
  const [received, setReceived] = useState(0);

  const { eventKey, status, channel } = filters;

  const matches = useCallback(
    (row: NotificationLogEvent) =>
      (!eventKey || row.eventKey === eventKey) &&
      (!status || row.status === status) &&
      (!channel || row.channel === channel),
    [eventKey, status, channel],
  );

  useEffect(() => {
    const socket = getSocket();

    const join = () => {
      socket.emit("notifications:subscribe");
      setLive(true);
    };
    const onDisconnect = () => setLive(false);

    const onRow = (row: NotificationLogEvent) => {
      if (!matches(row)) return;

      queryClient.setQueryData<NotificationLogPage>(
        notificationKeys.logs({ eventKey, status, channel }),
        (page) => {
          // Nothing fetched yet — let the query itself populate the list, or
          // we would show a single row as if it were the whole log.
          if (!page) return page;

          const entry = row as NotificationLogEntry;
          const at = page.items.findIndex((i) => i.id === entry.id);
          // A row is claimed, then sent, then delivered: the same id arrives
          // several times and must move through its states in place rather
          // than appear three times.
          if (at !== -1) {
            const items = [...page.items];
            items[at] = entry;
            return { ...page, items };
          }
          return { ...page, items: [entry, ...page.items] };
        },
      );
      setReceived((n) => n + 1);
    };

    // Rooms live on the server side of a connection, so a drop loses the
    // subscription silently — re-join on every reconnect. The connection
    // itself belongs to RealtimeProvider, which holds one open for the whole
    // session; this hook only manages room membership, the same way the
    // portfolio hook does.
    socket.on("connect", join);
    socket.on("disconnect", onDisconnect);
    socket.on("notification.log", onRow);
    if (socket.connected) join();

    return () => {
      socket.off("connect", join);
      socket.off("disconnect", onDisconnect);
      socket.off("notification.log", onRow);
      if (socket.connected) socket.emit("notifications:unsubscribe");
    };
  }, [queryClient, matches, eventKey, status, channel]);

  return { live, received };
}
