import type { Metadata } from "next";
import { EventFeedList } from "@/features/creator-events/components/event-feed-list";

export const metadata: Metadata = { title: "Events" };

/**
 * One centred reading column, no heading and no filters. The nav says Events;
 * the posts say the rest.
 *
 * The outer shell matches the other dashboard pages so the gutters line up
 * when switching tabs; the inner cap keeps a line of post text readable
 * rather than running the full width of a desktop screen.
 */
export default function BrandEventsPage() {
  return (
    <div className="w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto w-full max-w-3xl">
        <EventFeedList />
      </div>
    </div>
  );
}
