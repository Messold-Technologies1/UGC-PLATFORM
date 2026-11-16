import { AdminEventsTable } from "@/features/creator-events/components/admin-events-table";

/**
 * Creator event moderation.
 *
 * Posts publish instantly; this is the lever for the one thing free text can
 * break — a creator putting their real name or number in a post, which the
 * rest of the platform keeps behind their public slug.
 */
export default function AdminEventsPage() {
  return (
    <div className="w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 2xl:px-12">
      <AdminEventsTable />
    </div>
  );
}
