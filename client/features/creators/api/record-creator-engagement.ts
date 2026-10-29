import api from "@/lib/api";
import { creatorEngagementPath } from "@/lib/endpoints";

/** The two steps only the browser witnesses; a wishlist save is counted server-side. */
export type CreatorEngagementKind = "profile_view" | "add_to_cart";

/**
 * Keep our own dated copy of a step the Meta pixel already reports.
 *
 * The pixel's copy goes to Meta and stays there, so it cannot be counted when
 * the browse order is reshuffled. This can.
 *
 * Views are sent once per creator per tab. A brand clicking back and forth
 * between two profiles should not out-score a brand who looked at twenty, and
 * a page refresh starting the count again is close enough to a fresh visit.
 */
const sentThisSession = new Set<string>();

export function recordCreatorEngagement(
  creatorId: string,
  kind: CreatorEngagementKind,
): void {
  if (!creatorId) return;

  if (kind === "profile_view") {
    const key = `${kind}:${creatorId}`;
    if (sentThisSession.has(key)) return;
    sentThisSession.add(key);
  }

  // Fire-and-forget by design: nothing on screen waits for this, and a creator
  // losing a point of score is not worth surfacing an error for.
  void api.post(creatorEngagementPath(creatorId), { kind }).catch(() => {});
}
