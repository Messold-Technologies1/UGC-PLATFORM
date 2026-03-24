import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandCreatorsBrowser } from "@/features/brand";

export const metadata: Metadata = { title: "Browse Creators" };

export default function BrandCreatorsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Browse Creators"
        description="Find and hire talented UGC creators"
      />
      <BrandCreatorsBrowser />
    </div>
  );
}
