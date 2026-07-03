"use client";

import { CheckCircle2, Rocket } from "lucide-react";
import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";

/**
 * Shown at the top of the creator profile editor while the profile has not yet
 * gone live. Lists what's still required so the creator knows what to finish
 * before the "Go Live" button will submit.
 */
export function GoLiveBanner({ missing }: { missing: string[] }) {
  const ready = missing.length === 0;
  const profileFirst = isProfileFirstOnboardingMode();

  return (
    <div
      role="status"
      className={
        ready
          ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 sm:px-5"
          : "rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 sm:px-5"
      }
    >
      <div className="flex gap-3">
        <div
          className={
            ready
              ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600"
              : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600"
          }
        >
          {ready ? (
            <CheckCircle2 className="size-5" aria-hidden />
          ) : (
            <Rocket className="size-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          {ready ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                {profileFirst
                  ? "You're ready to submit for review"
                  : "You're ready to go live"}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {profileFirst ? (
                  <>
                    Everything looks complete. Hit{" "}
                    <span className="font-medium text-foreground">Go Live</span>{" "}
                    to submit your profile for admin review.
                  </>
                ) : (
                  <>
                    Everything looks complete. Hit{" "}
                    <span className="font-medium text-foreground">Go Live</span>{" "}
                    to publish your profile so brands can discover you.
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">
                Complete these fields to go live
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {profileFirst
                  ? "Complete your profile before submitting for admin review. Still needed:"
                  : "Brands can only find you once your profile is complete. Still needed:"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {missing.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-amber-500/30 bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
