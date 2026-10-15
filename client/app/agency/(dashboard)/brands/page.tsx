"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { Spinner } from "@/components/ui/spinner";
import { AgencyBrandsPanel } from "@/features/agency/components/agency-brands-panel";
import { useAuth } from "@/providers/auth-provider";

/**
 * Brands this agency manages, and the Partner ID that gets them here.
 */
export default function AgencyBrandsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center pt-4 lg:pt-5">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 pb-12 pt-4 lg:pt-5">
      <div className="mx-auto w-full max-w-[1180px] px-4">
        <PageHeader
          title="Brands"
          description="Share your Partner ID with a brand, accept their request, then switch into their account to work."
        />
        <div className="mt-6">
          <AgencyBrandsPanel />
        </div>
      </div>
    </div>
  );
}
