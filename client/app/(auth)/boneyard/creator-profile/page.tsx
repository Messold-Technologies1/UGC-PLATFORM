"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { CreatorProfileLoadingShell } from "@/components/dashboard/route-loading-shells";
import { BoneyardDashboardPreviewShell } from "../preview-shells";

export const dynamic = "force-dynamic";

export default function CreatorProfilePreviewPage() {
  return (
    <BoneyardDashboardPreviewShell>
      <BoneyardSkeleton
        name="creator-profile"
        loading
        fallback={<CreatorProfileLoadingShell />}
        fixture={<CreatorProfileLoadingShell />}
        transition
      >
        <CreatorProfileLoadingShell />
      </BoneyardSkeleton>
    </BoneyardDashboardPreviewShell>
  );
}
