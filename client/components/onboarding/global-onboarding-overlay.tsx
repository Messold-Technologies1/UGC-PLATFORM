"use client";

import { Building2, Clapperboard } from "lucide-react";
import { OnboardingOverlayShell } from "@/components/onboarding/onboarding-overlay-shell";
import { OnboardingMarketingColumn } from "@/components/onboarding/onboarding-marketing-column";
import { CreatorProfileSetupForm } from "@/features/creators/components/creator-profile-setup-form";
import { Button } from "@/components/ui/button";

const CREATOR_MARKETING_POINTS = [
  "Visible to brands searching for your style and rates",
  "Packages and deliverables set clear expectations upfront",
  "Update your profile anytime from creator settings",
] as const;

const BRAND_MARKETING_POINTS = [
  "Run campaigns and briefs from one hub",
  "Discover creators that fit your brand",
  "Track performance as you scale UGC",
] as const;

function marketingIconFooter(accentFromClass: "burgundy" | "emerald" | "navy") {
  const from =
    accentFromClass === "emerald"
      ? "from-emerald-950"
      : accentFromClass === "navy"
        ? "from-[#1e3a5f]"
        : "from-[#7a2a3a]";
  return (
    <div className="relative h-40 overflow-hidden rounded-xl bg-black/20 md:h-48">
      <div
        className={`absolute inset-0 bg-linear-to-t ${from} via-transparent to-transparent`}
      />
      <div className="flex h-full items-end justify-center pb-2 opacity-90">
        {accentFromClass === "navy" ? (
          <Building2 className="size-24 text-white/40" strokeWidth={1} />
        ) : (
          <Clapperboard className="size-24 text-white/40" strokeWidth={1} />
        )}
      </div>
    </div>
  );
}

export type GlobalOnboardingOverlayProps = {
  open: boolean;
  role: "creator" | "brand";
  onClose: () => void;
};

export function GlobalOnboardingOverlay({
  open,
  role,
  onClose,
}: GlobalOnboardingOverlayProps) {
  if (role === "creator") {
    return (
      <OnboardingOverlayShell
        open={open}
        dismissible={false}
        srTitle="Complete your creator profile"
        srDescription="Enter your public creator details and create your profile."
        left={
          <OnboardingMarketingColumn
            accentClassName="bg-emerald-950"
            title="Show brands what you bring"
            points={CREATOR_MARKETING_POINTS}
            footer={marketingIconFooter("emerald")}
          />
        }
        right={<CreatorProfileSetupForm onSuccess={onClose} />}
      />
    );
  }

  return (
    <OnboardingOverlayShell
      open={open}
      dismissible
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      srTitle="Brand setup"
      srDescription="Brand organization setup will be available in a future update."
      left={
        <OnboardingMarketingColumn
          accentClassName="bg-[#1e3a5f]"
          title="Welcome to your brand hub"
          points={BRAND_MARKETING_POINTS}
          footer={marketingIconFooter("navy")}
        />
      }
      right={
        <div className="flex max-h-[inherit] flex-col justify-center gap-6 overflow-y-auto bg-background p-8 md:p-10">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Brand setup coming soon
            </h2>
            <p className="text-sm text-muted-foreground">
              Organization and billing onboarding will live here. For now,
              continue to your dashboard when you are ready.
            </p>
          </div>
          <Button type="button" onClick={onClose} className="w-full sm:w-auto">
            Continue to dashboard
          </Button>
        </div>
      }
    />
  );
}
