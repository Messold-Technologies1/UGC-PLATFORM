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
    <div className="pt-4 lg:pt-5">
      <AdminEventsTable />
    </div>
  );
}
