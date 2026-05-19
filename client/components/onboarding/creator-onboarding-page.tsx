"use client";

import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import { CreatorOnboardingMarketingPanel } from "./creator-onboarding-marketing-panel";
import { CreatorOnboardingStepperForm } from "@/features/creators/components/creator-onboarding-stepper-form";

export function CreatorOnboardingPage({
  onSuccess,
  initialProfile,
}: {
  onSuccess: () => void | Promise<void>;
  initialProfile?: CreatorProfileItemApi | null;
}) {
  const mode = initialProfile ? "update" : "create";
  const profileId = initialProfile?.id;

  return (
    <div className="fixed inset-0 z-50 grid bg-white lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <CreatorOnboardingMarketingPanel />
        </div>
      </div>
      <div className="overflow-y-auto bg-white">
        <CreatorOnboardingStepperForm
          variant="onboarding"
          mode={mode}
          profileId={profileId}
          initialProfile={initialProfile}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}
