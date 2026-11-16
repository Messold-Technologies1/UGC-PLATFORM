import type { Metadata } from "next";
import { EventFeedList } from "@/features/creator-events/components/event-feed-list";

export const metadata: Metadata = { title: "Events" };

/**
 * The same feed brands see. An agency reaches it through the same BRAND
 * workspace the wishlists and briefs endpoints already use, so there is
 * nothing agency-specific below this page.
 */
export default function AgencyEventsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-4 lg:pt-5">
      <EventFeedList />
    </div>
  );
}
