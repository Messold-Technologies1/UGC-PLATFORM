"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  creatorProfileMeQueryKey,
  fetchCreatorProfileMe,
} from "@/features/creators/api/fetch-creator-profile-me";
import { CreatorProfileSetupForm } from "@/features/creators/components/creator-profile-setup-form.lazy";
import { useAuth } from "@/providers/auth-provider";

export default function CreatorSettingsProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: creatorProfileMeQueryKey,
    queryFn: fetchCreatorProfileMe,
    enabled: Boolean(user?.id && user.hasCreatorProfile),
    staleTime: 2 * 60_000,
  });

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (!user.hasCreatorProfile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Profile"
          description="Complete creator onboarding from the dashboard first."
        />
        <Button asChild>
          <Link href="/creator/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
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

      <CreatorProfileSetupForm
        variant="settings"
        mode="update"
        profileId={loaded.id}
        initialProfile={loaded}
        onSuccess={() => {}}
      />
    </div>
  );
}
