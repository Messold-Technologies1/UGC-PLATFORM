"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";

import { accountMenuItemClass } from "@/components/navbar/account-menu-styles";
import { cn } from "@/lib/utils";
import { useAgencyBrandLinksQuery } from "@/features/agency/hooks/use-agency-brand-links";
import { WorkspaceSwitcherDialog } from "@/features/agency/components/workspace-switcher-dialog";
import { useActiveBrand } from "@/providers/active-brand-provider";
import { useAuth } from "@/providers/auth-provider";

/**
 * The way into the workspace picker, living in the account menu.
 *
 * It used to be a pill of its own in the navbar, beside Credits. That put a
 * control only agencies ever see in the row everyone sees, and the account
 * menu is already where "who am I signed in as" questions are answered.
 *
 * The row leads with the workspace you are in rather than with the word
 * "Switch": an agency acting inside a brand is spending that brand's credits
 * under that brand's name, and that is not something to learn after the fact.
 * What the row does is the quiet second line, because it only matters once
 * you have read the first.
 */
export function WorkspaceSwitcherMenuItem({
  className,
}: {
  className?: string;
}) {
  const { user } = useAuth();
  const { activeBrandProfileId } = useActiveBrand();
  const [open, setOpen] = useState(false);

  /**
   * Who has a workspace to pick. Matches the test the agency nav items use,
   * so the picker and the links agree about who is an agency.
   */
  const isAgency =
    user?.primaryRole === "AGENCY" ||
    Boolean(user?.hasAgencyProfile && !user?.hasBrandProfile);

  const links = useAgencyBrandLinksQuery({ enabled: isAgency });
  const managed = (links.data ?? []).filter((link) => link.status === "ACTIVE");

  if (!isAgency) return null;

  /**
   * Normally there is nothing to switch between until a brand is linked, so
   * the row would only be noise. The exception is an agency already inside a
   * brand: if the list fails to load, hiding the row would strand them there
   * with no way back to their own account.
   */
  if (managed.length === 0 && activeBrandProfileId === null) return null;

  const current = managed.find((link) => link.brandId === activeBrandProfileId);
  const label = activeBrandProfileId
    ? (current?.brandName ?? "Brand")
    : "My Agency";

  return (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={() => setOpen(true)}
        className={cn(accountMenuItemClass, "w-full text-left", className)}
      >
        <ArrowLeftRight className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{label}</span>
          <span className="block truncate text-[11px] font-normal leading-tight text-muted-foreground/70">
            Click here to switch brands
          </span>
        </span>
      </button>

      <WorkspaceSwitcherDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
