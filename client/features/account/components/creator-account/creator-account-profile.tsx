"use client";

import { useMyPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-my-portfolio-videos-query";
import { useCreatorProfileMeQuery } from "@/features/creators/hooks/use-creator-profile-me-query";
import { CreatorAccountProfileView } from "./creator-account-profile-view";
import { Spinner } from "@/components/ui/spinner";

export function CreatorAccountProfile() {
  const { data: videos } = useMyPortfolioVideosQuery();
  const { data: profile, isLoading: isProfileLoading } =
    useCreatorProfileMeQuery();

  if (isProfileLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-border bg-card">
        <Spinner className="size-8 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  return <CreatorAccountProfileView profile={profile} videos={videos || []} />;
}
