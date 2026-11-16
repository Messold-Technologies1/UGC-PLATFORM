import type { Metadata } from "next";
import { CreatorEventsRail } from "@/features/creator-events/components/creator-events-rail";
import { EventComposer } from "@/features/creator-events/components/event-composer";
import { MyEventsList } from "@/features/creator-events/components/my-events-list";
import { MyEventsHeading } from "@/features/creator-events/components/my-events-heading";

export const metadata: Metadata = { title: "Events" };

/**
 * No page heading: the nav already says Events, and the composer is the first
 * thing a creator wants on this screen.
 */
export default function CreatorEventsPage() {
  return (
    <div className="pt-4 lg:pt-5">
      <div className="flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[999_1_35rem] flex-col gap-6">
          <EventComposer />
          <section>
            <MyEventsHeading />
            <MyEventsList />
          </section>
        </div>
        <CreatorEventsRail />
      </div>
    </div>
  );
}
