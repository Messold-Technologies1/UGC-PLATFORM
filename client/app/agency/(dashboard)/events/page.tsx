import type { Metadata } from "next";
import { EventFeedList } from "@/features/creator-events/components/event-feed-list";

export const metadata: Metadata = { title: "Events" };

/**
 * The same feed brands see, in the same full-width dashboard shell. An agency
 * reaches it through the same BRAND workspace the wishlists and briefs
 * endpoints already use, so there is nothing agency-specific below this page.
 */
export default function AgencyEventsPage() {
  return (
    <div className="w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 2xl:px-12">
      <EventFeedList />
    </div>
  );
}
