"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { Spinner } from "@/components/ui/spinner";
import { AgencyProfileSettingsForm } from "@/features/agency/components/agency-profile-settings-form";
import { useAgencyProfileMeQuery } from "@/features/agency/hooks/use-agency-profile-me-query";
import { useAuth } from "@/providers/auth-provider";

export default function AgencySettingsProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    data: profile,
    isLoading,
    isError,
  } = useAgencyProfileMeQuery({
    enabled: Boolean(user?.id && user.hasAgencyProfile),
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center pt-4 lg:pt-5">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (isError || !profile) {
    return (
      <div className="space-y-4 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-5">
        <PageHeader
          title="Agency profile"
          description="We could not load your agency profile. Try again shortly."
        />
      </div>
    );
  }

  return (
    <div className="pt-4 lg:pt-5">
      <AgencyProfileSettingsForm profile={profile} />
    </div>
  );
}
