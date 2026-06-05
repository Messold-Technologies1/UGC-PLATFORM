"use client";

import { useMyPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-my-portfolio-videos-query";
import { useCreatorProfileMeQuery } from "@/features/creators/hooks/use-creator-profile-me-query";
import { CreatorAccountProfileView } from "./creator-account-profile-view";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { AccountProfileLoadingShell } from "@/components/dashboard/route-loading-shells";

export function CreatorAccountProfile() {
  const { data: videos } = useMyPortfolioVideosQuery();
  const { data: profile, isLoading: isProfileLoading } =
    useCreatorProfileMeQuery();

  if (!isProfileLoading && !profile) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  return (
    <BoneyardSkeleton
      name="creator-account-profile"
      loading={isProfileLoading}
      fallback={<AccountProfileLoadingShell />}
      fixture={<AccountProfileLoadingShell />}
      transition
    >
      {profile && <CreatorAccountProfileView profile={profile} videos={videos || []} />}
    </BoneyardSkeleton>
  );
}
