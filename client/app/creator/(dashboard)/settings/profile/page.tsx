"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CreatorProfileUpdateForm } from "@/features/creators/components/creator-profile-update/creator-profile-update-form.lazy";
import { useCreatorProfileMeQuery } from "@/features/creators/hooks/use-creator-profile-me-query";
import { useAuth } from "@/providers/auth-provider";

export default function CreatorSettingsProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    data: profile,
    isLoading,
    isError,
  } = useCreatorProfileMeQuery({
    enabled: Boolean(user?.id && user.hasCreatorProfile),
    staleTime: 2 * 60_000,
  });

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  // if (!user.hasCreatorProfile) {
  //   return (
  //     <div className="space-y-6">
  //       <PageHeader
  //         title="Profile"
  //         description="Complete creator onboarding from your workspace first."
  //       />
  //       <Button asChild>
  //         <Link href="/creator/orders">Back to orders</Link>
  //       </Button>
  //     </div>
  //   );
  // }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (isError || profile == null) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Profile"
          description="We could not load your creator profile. Try again shortly."
        />
      </div>
    );
  }



  const loaded = profile;

  return (
    <div className="flex flex-1 w-full min-w-0 flex-col min-h-full">
      <Link
        href="/creator/settings/profile/edit"
        className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-3 transition-colors hover:bg-primary/10"
      >
        <span className="flex items-center gap-3">
          <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-foreground">
              Try the new step-by-step profile editor
            </span>
            <span className="block text-xs text-muted-foreground">
              A guided, milestone-based flow — save as you go.
            </span>
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
      </Link>
      <CreatorProfileUpdateForm
        variant="settings"
        mode="update"
        profileId={loaded.id}
        initialProfile={loaded}
        onSuccess={() => {}}
      />
    </div>
  );
}
