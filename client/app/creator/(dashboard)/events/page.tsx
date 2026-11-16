import type { Metadata } from "next";
import { CreatorEventsRail } from "@/features/creator-events/components/creator-events-rail";
import { EventComposer } from "@/features/creator-events/components/event-composer";
import { MyEventsList } from "@/features/creator-events/components/my-events-list";
import { MyEventsHeading } from "@/features/creator-events/components/my-events-heading";

export const metadata: Metadata = { title: "Events" };

/**
 * No page heading: the nav already says Events, and the composer is the first
 * thing a creator wants on this screen. The shell matches the other dashboard
 * pages so the gutters line up when switching tabs.
 */
export default function CreatorEventsPage() {
  return (
    <div className="w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 2xl:px-12">
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
