"use client";

import { Building2, Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgencyBrandLinksQuery } from "@/features/agency/hooks/use-agency-brand-links";
import { useActiveBrand } from "@/providers/active-brand-provider";

/**
 * Which workspace the agency is working in.
 *
 * "My Agency" is the agency's own account — the legacy direct mode, where the
 * agency owns its orders and briefs. Picking a brand instead puts every
 * subsequent request into that brand's workspace, where the BRAND owns
 * everything and the agency is only recorded as the actor.
 *
 * Only brands with an ACTIVE link appear; a pending request is not a workspace
 * you can enter, so showing it here would be an invitation to a 403.
 */
export function BrandSwitcher() {
  const { activeBrandProfileId, switchToBrand } = useActiveBrand();
  const links = useAgencyBrandLinksQuery();

  const managed = (links.data ?? []).filter((l) => l.status === "ACTIVE");
  const current = managed.find((l) => l.brandId === activeBrandProfileId);

  // Nothing to switch between, so the control would only add noise.
  if (managed.length === 0) return null;

  const label = activeBrandProfileId
    ? (current?.brandName ?? "Brand")
    : "My Agency";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center justify-between gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/60">
        <span className="flex min-w-0 items-center gap-2">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Working as</DropdownMenuLabel>

        <DropdownMenuItem onSelect={() => switchToBrand(null)}>
          <span className="flex-1">My Agency</span>
          {activeBrandProfileId === null ? (
            <Check className="size-4" />
          ) : null}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Brands you manage</DropdownMenuLabel>

        {managed.map((link) => (
          <DropdownMenuItem
            key={link.brandId}
            onSelect={() => switchToBrand(link.brandId)}
          >
            <span className="flex-1 truncate">
              {link.brandName ?? "Unnamed brand"}
            </span>
            {activeBrandProfileId === link.brandId ? (
              <Check className="size-4" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
