import type { Metadata } from "next";
import { EventFeedList } from "@/features/creator-events/components/event-feed-list";

export const metadata: Metadata = { title: "Events" };

/**
 * Full width inside the standard dashboard shell, so the gutters line up with
 * Orders and the rest when switching tabs. No heading and no filters: the nav
 * says Events, the posts say the rest.
 */
export default function BrandEventsPage() {
  return (
    <div className="w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 2xl:px-12">
      <EventFeedList />
    </div>
  );
}
