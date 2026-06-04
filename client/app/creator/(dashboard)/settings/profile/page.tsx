"use client";

import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CreatorProfileUpdateForm } from "@/features/creators/components/creator-profile-update-form.lazy";
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

  if (!user.hasCreatorProfile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Profile"
          description="Complete creator onboarding from your workspace first."
        />
        <Button asChild>
          <Link href="/creator/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

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
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description="Update your display name, bio, packages, and how brands find you."
      />

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
