import { PageHeader } from "@/components/dashboard/page-header";
import { CreatorListing } from "@/features/creators";

export default function BrandCreatorsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Browse Creators"
        description="Find and hire talented UGC creators"
      />
      <CreatorListing />
    </div>
  );
}
