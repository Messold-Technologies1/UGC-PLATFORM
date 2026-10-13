"use client";

import { CreatorListing } from "@/features/creators/components/creator-listing";
import { useExploreCreatorsPixel } from "@/features/analytics/hooks/use-explore-creators-pixel";
import type { CreatorsListResult } from "@/features/creators/hooks/use-creators-list-query";

export type BrandCreatorsBrowserProps = {
  initialData?: CreatorsListResult | null;
};

export function BrandCreatorsBrowser({
  initialData,
}: BrandCreatorsBrowserProps) {
  // Shared by /brand/creators and /agency/creators — the single mount point for
  // the catalogue, so the "Creators" navbar step is reported from here.
  useExploreCreatorsPixel();
  return <CreatorListing initialData={initialData ?? undefined} />;
}
