"use client";

import { Spinner } from "@/components/ui/spinner";
import { AgencyBrandsPanel } from "@/features/agency/components/agency-brands-panel";
import { useAuth } from "@/providers/auth-provider";

/**
 * Brands this agency manages, and the Partner ID that gets them here.
 *
 * The panel owns its own page padding so it matches the credits page, which is
 * the closest sibling in this nav — full-bleed with responsive gutters rather
 * than a centred column.
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

  return <AgencyBrandsPanel />;
}
