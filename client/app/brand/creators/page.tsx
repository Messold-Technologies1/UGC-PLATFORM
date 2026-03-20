import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { CreatorListing } from "@/features/creators";
import { MOCK_CREATORS } from "@/features/creators/data";

export const metadata: Metadata = { title: "Browse Creators" };

export const revalidate = 300;

export default function BrandCreatorsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Browse Creators"
        description="Find and hire talented UGC creators"
      />
      <Suspense>
        <CreatorListing creators={MOCK_CREATORS} />
      </Suspense>
    </div>
  );
}
