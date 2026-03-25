"use client";

import { Building2, Clapperboard } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OnboardingOverlayShell } from "@/components/onboarding/onboarding-overlay-shell";
import { OnboardingMarketingColumn } from "@/components/onboarding/onboarding-marketing-column";

const MARKETING_POINTS = [
  "Connect with brands or creators in one place",
  "Manage briefs, deliverables, and payouts",
  "Grow your presence with a profile built for UGC",
] as const;

export type PostLoginRoleOverlayProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissible?: boolean;
  onContinueAsCreator?: () => void | Promise<void>;
  onContinueAsBrand?: () => void | Promise<void>;
  className?: string;
};

const ROLE_FOOTER = (
  <div className="relative h-40 overflow-hidden rounded-xl bg-black/20 md:h-48">
    <div className="absolute inset-0 bg-linear-to-t from-[#7a2a3a] via-transparent to-transparent" />
    <div className="flex h-full items-end justify-center pb-2 opacity-90">
      <Clapperboard className="size-24 text-white/40" strokeWidth={1} />
    </div>
  </div>
);

export function PostLoginRoleOverlay({
  open,
  onOpenChange,
  dismissible = false,
  onContinueAsCreator,
  onContinueAsBrand,
  className,
}: PostLoginRoleOverlayProps) {
  return (
    <OnboardingOverlayShell
      open={open}
      onOpenChange={onOpenChange}
      dismissible={dismissible}
      className={cn(className)}
      srTitle="Choose how you want to continue"
      srDescription="Select whether you are joining as a creator or as a brand to tailor your experience."
      left={
        <OnboardingMarketingColumn
          accentClassName="bg-[#7a2a3a]"
          title="Your next collaboration starts here"
          points={MARKETING_POINTS}
          footer={ROLE_FOOTER}
        />
      }
      right={
        <div className="flex max-h-[inherit] flex-col overflow-y-auto bg-background p-8 md:p-10">
          <div className="mb-8 space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              How do you want to continue?
            </h2>
            <p className="text-sm text-muted-foreground">
              Pick the path that matches you now. You can add the other role or
              switch workspaces anytime from your account menu.
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-auto w-full justify-start gap-4 rounded-xl border-border px-5 py-4 text-left font-medium shadow-none hover:bg-muted/60"
              onClick={async () => {
                try {
                  await onContinueAsCreator?.();
                  onOpenChange?.(false);
                } catch {
                  /* Caller handles errors */
                }
              }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Clapperboard className="size-5 text-foreground" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 text-left">
                <span className="text-base">Continue as Creator</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Find brand work, submit content, get paid
                </span>
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-auto w-full justify-start gap-4 rounded-xl border-border px-5 py-4 text-left font-medium shadow-none hover:bg-muted/60"
              onClick={async () => {
                try {
                  await onContinueAsBrand?.();
                  onOpenChange?.(false);
                } catch {
                  /* Caller handles errors */
                }
              }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Building2 className="size-5 text-foreground" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 text-left">
                <span className="text-base">Continue as Brand</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Post briefs, review creators, run campaigns
                </span>
              </span>
            </Button>
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
            By continuing you agree to our{" "}
            <a
              href="/terms"
              className="text-primary underline-offset-2 hover:underline"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="text-primary underline-offset-2 hover:underline"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      }
    />
  );
}
