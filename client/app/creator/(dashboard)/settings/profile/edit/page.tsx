"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Spinner } from "@/components/ui/spinner";
import { CreatorProfileWizard } from "@/features/creators/components/creator-profile-wizard/creator-profile-wizard";
import { useCreatorProfileMeQuery } from "@/features/creators/hooks/use-creator-profile-me-query";
import { useAuth } from "@/providers/auth-provider";

export default function CreatorProfileWizardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const {
    data: profile,
    isLoading,
    isError,
  } = useCreatorProfileMeQuery({
    enabled: Boolean(user?.id && user.hasCreatorProfile),
    staleTime: 2 * 60_000,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (isError || profile == null) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Edit profile"
          description="We could not load your creator profile. Try again shortly."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full min-w-0 flex-1 flex-col">
      <CreatorProfileWizard
        profileId={profile.id}
        initialProfile={profile}
        onExit={() => router.push("/creator/settings/profile")}
      />
    </div>
  );
}
