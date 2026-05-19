"use client";

import { useEffect } from "react";
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


  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-white lg:grid lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
  
      <div className="hidden lg:block">
        <div className="h-full overflow-y-auto bg-[#FAFBFD]">
          <CreatorOnboardingMarketingPanel />
        </div>
      </div>

    
      <div className="flex-1 overflow-y-auto bg-white">
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
