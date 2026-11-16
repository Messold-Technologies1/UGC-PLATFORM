import { useQuery } from "@tanstack/react-query";
import { listEventFeed } from "../api/list-event-feed";

/**
 * How far back the probe looks. Anything beyond this reports as "20+", which
 * is all a pill needs to say.
 */
const PROBE_SIZE = 20;
const PROBE_INTERVAL_MS = 60_000;

export const newEventsProbeQueryKey = [
  "creator-events",
  "feed",
  "probe",
] as const;

/**
 * Counts posts published since the feed was loaded, without disturbing it.
 *
 * Splicing new posts in while someone is reading moves the text under their
 * eyes, so the feed stays frozen and this drives a pill they can tap when
 * they are ready. React Query does not poll a backgrounded tab by default, so
 * a feed left open in a spare tab costs nothing.
 */
export function useNewEventsIndicator(topEventId: string | undefined) {
  const probe = useQuery({
    queryKey: newEventsProbeQueryKey,
    queryFn: () => listEventFeed({ limit: PROBE_SIZE }),
    refetchInterval: PROBE_INTERVAL_MS,
    enabled: Boolean(topEventId),
  });

  if (!topEventId || !probe.data) return { newCount: 0, atLeast: false };

  const index = probe.data.items.findIndex((item) => item.id === topEventId);

  // The post the reader is sitting on has fallen off the probe window, so
  // there are at least PROBE_SIZE newer ones.
  if (index === -1) return { newCount: PROBE_SIZE, atLeast: true };

  return { newCount: index, atLeast: false };
}
