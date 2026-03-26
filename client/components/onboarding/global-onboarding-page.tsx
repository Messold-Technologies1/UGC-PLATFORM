"use client";

import { CreatorProfileSetupForm } from "@/features/creators/components/creator-profile-setup-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GlobalOnboardingPageProps = {
  role: "creator" | "brand";
  onClose: () => void;
  className?: string;
};

export function GlobalOnboardingPage({
  role,
  onClose,
  className,
}: GlobalOnboardingPageProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-background",
        className,
      )}
    >
      {role === "creator" ? (
        <div className="mx-auto w-full max-w-4xl flex-1">
          <CreatorProfileSetupForm onSuccess={onClose} />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-4xl flex-1 px-8 pb-10 pt-8 md:px-10 md:pt-10">
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
            <Button type="button" onClick={onClose} className="w-full sm:w-auto">
              Continue to dashboard
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
