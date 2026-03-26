"use client";

import Link from "next/link";
import { ArrowRight, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

const PROFILE_SETUP_HREF = "/creator/settings?onboarding=creator";

export function CreatorIncompleteProfileBanner() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return null;
  const workspaceRole = user.activeRole ?? user.primaryRole;
  if (workspaceRole !== "CREATOR") return null;
  if (user.hasCreatorProfile) return null;

  return (
    <div
      className="rounded-2xl border border-border bg-muted/30 px-4 py-4 sm:px-5"
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/10">
            <UserCircle className="size-5 text-foreground" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Complete your creator profile
            </p>
            <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
              Add your bio, packages, and details so brands can find and brief
              you. You can finish this anytime from Settings.
            </p>
          </div>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href={PROFILE_SETUP_HREF} prefetch className="gap-2">
            Continue setup
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
