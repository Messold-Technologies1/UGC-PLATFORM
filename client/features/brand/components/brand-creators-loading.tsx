"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { CreatorsBrowserLoadingShell } from "@/components/dashboard/route-loading-shells";

export function BrandCreatorsLoadingState() {
  return (
    <BoneyardSkeleton
      name="brand-creators-browser"
      loading
      fallback={<CreatorsBrowserLoadingShell />}
      fixture={<CreatorsBrowserLoadingShell />}
      transition
    >
      <CreatorsBrowserLoadingShell />
    </BoneyardSkeleton>
  );
}
