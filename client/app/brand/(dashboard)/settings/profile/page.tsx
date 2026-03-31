"use client";

import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/dashboard/page-header";
import { useAuth } from "@/providers/auth-provider";
import {
  brandProfileMeQueryKey,
  fetchBrandProfileMe,
} from "@/features/brands/api/fetch-brand-profile-me";
import { BrandProfileSetupForm } from "@/features/brands/components/brand-profile-setup-form.lazy";

export default function BrandSettingsProfilePage() {
  const { user, isLoading: authLoading } = useAuth();

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: brandProfileMeQueryKey,
    queryFn: fetchBrandProfileMe,
    enabled: Boolean(user?.id && user.hasBrandProfile),
    staleTime: 2 * 60_000,
    retry: false,
  });

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || profile == null) {
    if (user.hasBrandProfile) {
      return (
        <div className="space-y-4">
          <PageHeader
            title="Profile"
            description="We could not load your brand profile. Try again shortly."
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description={
          user.hasBrandProfile
            ? "Update your company details and logo."
            : "Add your company details and logo."
        }
      />

      <BrandProfileSetupForm
        variant="settings"
        mode="update"
        initialProfile={profile ?? null}
        onSuccess={() => {}}
      />
    </div>
  );
}
