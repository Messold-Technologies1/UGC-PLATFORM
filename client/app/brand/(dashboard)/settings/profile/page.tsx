"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/providers/auth-provider";
import { BrandProfileSetupForm } from "@/features/brands/components/brand-profile-setup-form.lazy";
import { useBrandProfileStateQuery } from "@/features/brands/hooks/use-brand-profile-state-query";

export default function BrandSettingsProfilePage() {
  const { user, isLoading: authLoading } = useAuth();

  const {
    data: profileState,
    isLoading,
    isError,
  } = useBrandProfileStateQuery({
    enabled: Boolean(user?.id && user.hasBrandProfile && !user.brandAccessRevoked),
    staleTime: 2 * 60_000,
    retry: false,
  });

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (user.brandAccessRevoked || profileState?.kind === "revoked") {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Brand Access Removed"
          description="Your brand access has been removed by admin."
        />
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

  if (isError) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Profile"
          description="We could not load your brand profile. Try again shortly."
        />
      </div>
    );
  }

  const hasExistingProfile = profileState?.kind === "ready";
  const initialProfile = hasExistingProfile ? profileState.profile : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description="Update your company details and logo."
      />

      <BrandProfileSetupForm
        variant="settings"
        mode="update"
        initialProfile={initialProfile}
        onSuccess={() => {}}
      />
    </div>
  );
}
