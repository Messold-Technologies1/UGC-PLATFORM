"use client";

import { useCallback, useState } from "react";
import { Building2, Clapperboard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { CreatorProfileSetupForm } from "@/features/creators/components/creator-profile-setup-form.lazy";
import { BrandProfileSetupForm } from "@/features/brands/components/brand-profile-setup-form.lazy";
import { Button } from "@/components/ui/button";
import { OnboardingOverlayShell } from "@/components/onboarding/onboarding-overlay-shell";
import { OnboardingMarketingColumn } from "@/components/onboarding/onboarding-marketing-column";
import { ensureWorkspaceSelection } from "@/features/auth/lib/ensure-workspace-selection";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

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
  className?: string;
};

export function GlobalOnboardingPage({
  role,
  onClose,
  onBrandDismiss,
  className,
}: GlobalOnboardingPageProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [brandContinuePending, setBrandContinuePending] = useState(false);

  const handleBrandContinue = useCallback(async () => {
    setBrandContinuePending(true);
    try {
      const ok = await ensureWorkspaceSelection(queryClient, user, "BRAND");
      if (!ok) return;
      onBrandDismiss?.();
      onClose();
    } finally {
      setBrandContinuePending(false);
    }
  }, [queryClient, user, onBrandDismiss, onClose]);

  const rightColumnClass =
    "flex max-h-[inherit] min-h-0 flex-col overflow-y-auto bg-background p-8 md:p-10";

  const marketingAccentClass =
    role === "brand" ? "bg-emerald-800" : "bg-[#7a2a3a]";
  const marketingFooter =
    role === "brand" ? BRAND_MARKETING_FOOTER : CREATOR_MARKETING_FOOTER;

  return (
    <OnboardingOverlayShell
      open
      dismissible={false}
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
          <div className={rightColumnClass}>
            <CreatorProfileSetupForm
              variant="onboarding"
              mode="create"
              onSuccess={onClose}
            />
          </div>
        ) : (
          <div className={rightColumnClass}>
            <BrandProfileSetupForm
              variant="onboarding"
              mode="create"
              onSuccess={async () => {
                onBrandDismiss?.();
                onClose();
              }}
            />
            <div className="mt-6 flex items-center justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={brandContinuePending}
                onClick={() => void handleBrandContinue()}
              >
                Skip for now
              </Button>
            </div>
          </div>
        )
      }
    />
  );
}
