"use client";

import { Store } from "lucide-react";
import { useMeQuery } from "@/features/auth/hooks/use-me-query";
import {
  resolveClientActiveBrandId,
} from "@/features/brands/lib/active-brand";

function BrandChip({
  brandName,
  logoUrl,
}: {
  brandName: string | null;
  logoUrl: string | null;
}) {
  return (
    <div className="flex h-9 max-w-[14rem] items-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 text-sm">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-5 rounded object-cover" />
      ) : (
        <Store className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate font-medium">{brandName ?? "Brand"}</span>
    </div>
  );
}

/** Standalone brand accounts with a single linked profile (no agency switching). */
export function BrandSwitcher() {
  const { data: user } = useMeQuery();

  if (user?.roles.includes("AGENCY")) {
    return null;
  }

  if (!user?.hasBrandProfile || user.accessibleBrands.length === 0) {
    return null;
  }

  if (user.accessibleBrands.length === 1) {
    const only = user.accessibleBrands[0]!;
    return <BrandChip brandName={only.brandName} logoUrl={only.logoUrl} />;
  }

  const activeId = resolveClientActiveBrandId(user);
  const active =
    user.accessibleBrands.find((b) => b.id === activeId) ??
    user.accessibleBrands[0]!;

  return <BrandChip brandName={active.brandName} logoUrl={active.logoUrl} />;
}
