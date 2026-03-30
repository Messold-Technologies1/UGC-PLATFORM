"use client";

import { Clapperboard } from "lucide-react";

import { CreatorProfileSetupForm } from "@/features/creators/components/creator-profile-setup-form.lazy";
import { Button } from "@/components/ui/button";
import { OnboardingOverlayShell } from "@/components/onboarding/onboarding-overlay-shell";
import { OnboardingMarketingColumn } from "@/components/onboarding/onboarding-marketing-column";
import { cn } from "@/lib/utils";

/** Aligned with `PostLoginRoleOverlay` — same story and visual language after choosing creator vs brand. */
const ONBOARDING_MARKETING_POINTS = [
  "Connect with brands or creators in one place",
  "Manage briefs, deliverables, and payouts",
  "Grow your presence with a profile built for UGC",
] as const;

const ONBOARDING_MARKETING_FOOTER = (
  <div className="relative h-40 overflow-hidden rounded-xl bg-black/20 md:h-48">
    <div className="absolute inset-0 bg-linear-to-t from-[#7a2a3a] via-transparent to-transparent" />
    <div className="flex h-full items-end justify-center pb-2 opacity-90">
      <Clapperboard className="size-24 text-white/40" strokeWidth={1} />
    </div>
  </div>
);

export type GlobalOnboardingPageProps = {
  role: "creator" | "brand";
  onClose: () => void;
  /** Brand has no profile API yet; dismiss overlay for this session only. */
  onBrandDismiss?: () => void;
  className?: string;
};

export function GlobalOnboardingPage({
  role,
  onClose,
  onBrandDismiss,
  className,
}: GlobalOnboardingPageProps) {
  const rightColumnClass =
    "flex max-h-[inherit] min-h-0 flex-col overflow-y-auto bg-background p-8 md:p-10";

  return (
    <OnboardingOverlayShell
      open
      dismissible={false}
      contentVariant="scrollable"
      className={cn(className)}
      srTitle={
        role === "creator"
          ? "Set up your creator profile"
          : "Brand workspace setup"
      }
      srDescription={
        role === "creator"
          ? "Complete your profile so brands can find you and brief you."
          : "Continue to your brand dashboard or dismiss when ready."
      }
      left={
        <OnboardingMarketingColumn
          accentClassName="bg-[#7a2a3a]"
          title="Your next collaboration starts here"
          points={ONBOARDING_MARKETING_POINTS}
          footer={ONBOARDING_MARKETING_FOOTER}
        />
      }
      right={
        role === "creator" ? (
          <div className={rightColumnClass}>
            <CreatorProfileSetupForm
              variant="onboarding"
              mode="create"
              onSuccess={onClose}
            />
          </div>
        ) : (
          <div className={rightColumnClass}>
            <section
              aria-labelledby="brand-onboarding-heading"
              className="flex flex-col gap-6"
            >
              <h1
                id="brand-onboarding-heading"
                className="text-xl font-bold tracking-tight text-foreground md:text-2xl"
              >
                Brand setup coming soon
              </h1>
              <p className="text-sm text-muted-foreground">
                Organization and billing onboarding will live here. For now,
                continue to your dashboard when you are ready.
              </p>
              <Button
                type="button"
                onClick={() => {
                  onBrandDismiss?.();
                  onClose();
                }}
                className="w-full sm:w-auto"
              >
                Continue to dashboard
              </Button>
            </section>
          </div>
        )
      }
    />
  );
}
