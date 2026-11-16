import type { Metadata } from "next";
import { EventFeedList } from "@/features/creator-events/components/event-feed-list";

export const metadata: Metadata = { title: "Events" };

/**
 * One centred column, no heading and no filters. The nav says Events; the
 * posts say the rest.
 */
export default function BrandEventsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-4 lg:pt-5">
      <EventFeedList />
    </div>
  );
}
