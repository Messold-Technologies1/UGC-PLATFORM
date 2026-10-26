"use client";

import { Spinner } from "@/components/ui/spinner";
import { BrandAgencyLinksPanel } from "@/features/brands/components/brand-agency-links-panel";
import { useAuth } from "@/providers/auth-provider";

/**
 * Agencies that manage this brand, and where a brand redeems a Partner ID.
 *
 * The counterpart to the agency's Brands page. It used to live as a card at
 * the bottom of brand settings, below the profile form and notification
 * preferences, with nothing in the nav pointing at it — so a brand handed a
 * code by their agency had no way to find where it went.
 *
 * The panel owns its own page padding, matching the credits page.
 */
export default function BrandAgenciesPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center pt-4 lg:pt-5">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return <BrandAgencyLinksPanel />;
}
