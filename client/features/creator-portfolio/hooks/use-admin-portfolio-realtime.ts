"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

/**
 * Join a creator's portfolio room so an admin sees reels they imported on that
 * creator's behalf settle from PROCESSING.
 *
 * Creators need nothing like this: the same events are also emitted to their own
 * `user:` room, which every socket joins on connect. Only an admin is watching
 * a portfolio that is not their own.
 *
 * The listener itself lives in RealtimeProvider with every other event — this
 * hook only manages room membership.
 */
export function useAdminPortfolioRealtime(creatorProfileId?: string): void {
  useEffect(() => {
    if (!creatorProfileId) return;
    const socket = getSocket();

    const join = () => {
      socket.emit("portfolio:subscribe", { creatorProfileId });
    };

    // Re-join on every reconnect: rooms live on the server side of a
    // connection, so a drop silently loses the subscription.
    socket.on("connect", join);
    if (socket.connected) join();

    return () => {
      socket.off("connect", join);
      if (socket.connected) {
        socket.emit("portfolio:unsubscribe", { creatorProfileId });
      }
    };
  }, [creatorProfileId]);
}
