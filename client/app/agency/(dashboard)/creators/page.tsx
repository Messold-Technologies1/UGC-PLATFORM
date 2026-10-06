import type { Metadata } from "next";
import { BrandCreatorsBrowser } from "@/features/brands/components/brand-creators-browser.lazy";
import { fetchInitialCreatorsList } from "@/features/creators/api/fetch-initial-creators";
import { BROWSE_LIST_LIMIT } from "@/features/creators/lib/browse-constants";

export const metadata: Metadata = { title: "Browse Creators" };

export default async function AgencyCreatorsPage() {
  const initialData = await fetchInitialCreatorsList(BROWSE_LIST_LIMIT);

  return (
    <div className="flex-1 flex flex-col min-h-full">
      <BrandCreatorsBrowser initialData={initialData} />
    </div>
  );
}
