"use client";

import { CreatorProfileSetupForm } from "@/features/creators/components/creator-profile-setup-form.lazy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-4 py-8 backdrop-blur-md",
        className,
      )}
    >
      {role === "creator" ? (
        <div className="w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl shadow-black/20">
          <CreatorProfileSetupForm
            variant="onboarding"
            mode="create"
            onSuccess={onClose}
          />
        </div>
      ) : (
        <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/20 md:p-10">
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
      )}
    </div>
  );
}
