"use client";

import { useCallback, useState } from "react";
import { Building2, Clapperboard } from "lucide-react";

import { CreatorProfileSetupForm } from "@/features/creators/components/creator-profile-setup-form.lazy";
import { BrandProfileSetupForm } from "@/features/brands/components/brand-profile-setup-form.lazy";
import { Spinner } from "@/components/ui/spinner";
import { OnboardingOverlayShell } from "@/components/onboarding/onboarding-overlay-shell";
import { OnboardingMarketingColumn } from "@/components/onboarding/onboarding-marketing-column";
import { cn } from "@/lib/utils";

const ONBOARDING_MARKETING_POINTS = [
  "Connect with brands or creators in one place",
  "Manage briefs, deliverables, and payouts",
  "Grow your presence with a profile built for UGC",
] as const;

const CREATOR_MARKETING_FOOTER = (
  <div className="relative h-40 overflow-hidden rounded-xl bg-black/20 md:h-48">
    <div className="absolute inset-0 bg-linear-to-t from-[#7a2a3a] via-transparent to-transparent" />
    <div className="flex h-full items-end justify-center pb-2 opacity-90">
      <Clapperboard className="size-24 text-white/40" strokeWidth={1} />
    </div>
  </div>
);

const BRAND_MARKETING_FOOTER = (
  <div className="relative h-40 overflow-hidden rounded-xl bg-black/20 md:h-48">
    <div className="absolute inset-0 bg-linear-to-t from-emerald-950 via-transparent to-transparent" />
    <div className="flex h-full items-end justify-center pb-2 opacity-90">
      <Building2 className="size-24 text-white/40" strokeWidth={1} />
    </div>
  </div>
);

export type GlobalOnboardingPageProps = {
  role: "creator" | "brand";
  onClose: () => void;

  onBrandDismiss?: () => void;
  onCreatorBack?: () => void | Promise<void>;
  onProfileCreated?: () => void | Promise<void>;
  className?: string;
};

export function GlobalOnboardingPage({
  role,
  onClose,
  onBrandDismiss,
  onCreatorBack,
  onProfileCreated,
  className,
}: GlobalOnboardingPageProps) {
  const [brandContinuePending, setBrandContinuePending] = useState(false);
  const [creationPending, setCreationPending] = useState(false);

  const handleBrandContinue = useCallback(async () => {
    setBrandContinuePending(true);
    try {
      onBrandDismiss?.();
      onClose();
    } finally {
      setBrandContinuePending(false);
    }
  }, [onBrandDismiss, onClose]);

  const rightColumnShellClass =
    "relative flex min-h-0 max-h-[inherit] flex-col overflow-hidden bg-background";
  const rightColumnScrollClass =
    "min-h-0 flex-1 overflow-y-auto p-8 md:p-10";

  const marketingAccentClass =
    role === "brand" ? "bg-emerald-800" : "bg-[#7a2a3a]";
  const marketingFooter =
    role === "brand" ? BRAND_MARKETING_FOOTER : CREATOR_MARKETING_FOOTER;
  const handleClose = useCallback(async () => {
    if (role === "creator" && onCreatorBack) {
      await onCreatorBack();
      return;
    }

    if (role === "brand") {
      await handleBrandContinue();
      return;
    }

    onClose();
  }, [handleBrandContinue, onClose, onCreatorBack, role]);

  return (
    <OnboardingOverlayShell
      open
      onOpenChange={(open) => {
        if (open) return;
        void handleClose();
      }}
      dismissible={false}
      showCloseButton
      closeButtonDisabled={
        creationPending || (role === "brand" && brandContinuePending)
      }
      contentVariant="scrollable"
      className={cn("max-w-[min(100%,72rem)]", className)}
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
          accentClassName={marketingAccentClass}
          title="Your next collaboration starts here"
          points={ONBOARDING_MARKETING_POINTS}
          footer={marketingFooter}
        />
      }
      right={
        role === "creator" ? (
          <div className={rightColumnShellClass}>
            {creationPending ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/78 text-center backdrop-blur-sm">
                <Spinner className="size-8 text-primary" aria-hidden />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Creating creator profile…
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    We&apos;re setting up your creator workspace and getting everything ready.
                  </p>
                </div>
              </div>
            ) : null}
            <div className={rightColumnScrollClass}>
              <CreatorProfileSetupForm
                variant="onboarding"
                mode="create"
                onSuccess={onProfileCreated ?? (() => {})}
                onPendingChange={setCreationPending}
              />
            </div>
          </div>
        ) : (
          <div className={rightColumnShellClass}>
            {creationPending ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/78 text-center backdrop-blur-sm">
                <Spinner className="size-8 text-primary" aria-hidden />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Creating brand profile…
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    We&apos;re preparing your brand workspace and saving your company details.
                  </p>
                </div>
              </div>
            ) : null}
            <div className={rightColumnScrollClass}>
              <BrandProfileSetupForm
                variant="onboarding"
                mode="create"
                onSuccess={onProfileCreated ?? (() => {})}
                onPendingChange={setCreationPending}
              />
            </div>
          </div>
        )
      }
    />
  );
}
