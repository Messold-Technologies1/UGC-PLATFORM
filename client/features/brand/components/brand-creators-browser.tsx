"use client";

import { CreatorListing } from "@/features/creators/components/creator-listing";
import type { CreatorsListResult } from "@/features/creators/hooks/use-creators-list-query";

export type BrandCreatorsBrowserProps = {
  initialData?: CreatorsListResult | null;
};

export function BrandCreatorsBrowser({
  initialData,
}: BrandCreatorsBrowserProps) {
  return <CreatorListing initialData={initialData ?? undefined} />;
}
