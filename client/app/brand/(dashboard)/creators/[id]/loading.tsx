"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { CreatorProfileLoadingShell } from "@/components/dashboard/route-loading-shells";

export default function CreatorProfileLoading() {
  return (
    <BoneyardSkeleton
      name="creator-profile"
      loading
      fallback={<CreatorProfileLoadingShell />}
      fixture={<CreatorProfileLoadingShell />}
      transition
    >
      <CreatorProfileLoadingShell />
    </BoneyardSkeleton>
  );
}
