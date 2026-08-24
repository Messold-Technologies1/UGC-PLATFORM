"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { CatalogStatus } from "@/features/creators/components/creator-profile-update/shared-components";
import {
  PackageEditor,
  AddOnCatalogEditor,
} from "@/features/creators/components/creator-profile-update/package-and-addon-editors";
import { PackageEarningsBanner } from "@/features/creators/components/creator-profile-update/package-earnings-banner";
import type { PackageDraft, AddOnDraft } from "@/features/creators/hooks/creator-profile-form-utils";
import type { CreatorAddOnOption } from "@/features/creators/api/get-creator-add-on-options";
import { WizardAccordionSection } from "./wizard-parts";

export type PricingStepProps = {
  disabled: boolean;

  packageDraft: PackageDraft;
  onPackageChange: (draft: PackageDraft) => void;
  packageErrors: {
    priceAmount?: string;
    deliveryDays?: string;
    videoLengthSeconds?: string;
  };

  addOnOptions: CreatorAddOnOption[];
  selectedAddOnSlugs: string[];
  addOnDrafts: Record<string, AddOnDraft>;
  unmatchedNames: string[];
  addOnsLoading: boolean;
  addOnsError: boolean;
  onAddOnsRetry: () => void;
  onToggleAddOn: (option: CreatorAddOnOption) => void;
  onAddOnDraftChange: (slug: string, patch: Partial<AddOnDraft>) => void;
  defaultsConfirmed: boolean;
  onDefaultsConfirmedChange: (confirmed: boolean) => void;
  errors?: {
    defaultsConfirmed?: string;
    addOnPrices?: string;
  };
  addonsReviewed?: boolean;
  onAddonsReviewed?: () => void;
};

type PricingSectionId = "package" | "addons";

export function PricingStep({
  disabled,
  packageDraft,
  onPackageChange,
  packageErrors,
  addOnOptions,
  selectedAddOnSlugs,
  addOnDrafts,
  unmatchedNames,
  addOnsLoading,
  addOnsError,
  onAddOnsRetry,
  onToggleAddOn,
  onAddOnDraftChange,
  defaultsConfirmed,
  onDefaultsConfirmedChange,
  addonsReviewed = true,
  onAddonsReviewed,
  errors = {},
}: PricingStepProps) {
  const packageComplete =
    Boolean(packageDraft.priceAmount.trim()) &&
    Boolean(packageDraft.deliveryDays.trim()) &&
    defaultsConfirmed;
  const mandatoryCount = addOnOptions.filter((option) => option.mandatory).length;
  const extraAddOns = addOnOptions.filter(
    (option) => !option.mandatory && !selectedAddOnSlugs.includes(option.slug),
  );
  const extraCount = extraAddOns.length;
  const addOnSummary =
    extraCount > 0
      ? `${selectedAddOnSlugs.length} selected · ${extraCount} extra to review`
      : selectedAddOnSlugs.length > 0
        ? `${selectedAddOnSlugs.length} selected`
        : undefined;
  const extrasLabel = extraAddOns.map((option) => option.name).join(" or ");
  const packageSummary = [
    packageDraft.priceAmount.trim()
      ? `₹${packageDraft.priceAmount}`
      : null,
    packageDraft.deliveryDays.trim()
      ? `${packageDraft.deliveryDays} days`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const firstError: PricingSectionId | null = errors.defaultsConfirmed
    ? "package"
    : errors.addOnPrices
      ? "addons"
      : null;

  const [openId, setOpenId] = useState<PricingSectionId | "closed" | null>(
    null,
  );
  const fallback: PricingSectionId = firstError ?? "package";
  const open = openId === "closed" ? null : (openId ?? fallback);

  function toggleSection(id: string) {
    setOpenId((current) => {
      const resolved = current === "closed" ? null : (current ?? fallback);
      const next = resolved === id ? "closed" : (id as PricingSectionId);
      if (next === "addons") onAddonsReviewed?.();
      return next;
    });
  }

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 961px)");
    function sync(matches: boolean) {
      if (matches) onAddonsReviewed?.();
    }
    sync(desktop.matches);
    const onChange = (event: MediaQueryListEvent) => sync(event.matches);
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, [onAddonsReviewed]);

  useEffect(() => {
    if (!firstError) return;
    setOpenId(firstError);
    if (firstError === "addons") onAddonsReviewed?.();
  }, [firstError, onAddonsReviewed]);

  return (
    <div className="cw-card">
      <PackageEarningsBanner
        packagePriceAmount={packageDraft.priceAmount}
        selectedAddOnSlugs={selectedAddOnSlugs}
        addOnDrafts={addOnDrafts}
      />

      <div className="cw-acc-stack">
        <WizardAccordionSection
          id="package"
          title="Your package"
          required
          complete={packageComplete}
          summary={packageSummary || undefined}
          open={open === "package"}
          onOpen={toggleSection}
        >
          <PackageEditor
            draft={packageDraft}
            disabled={disabled}
            onChange={onPackageChange}
            errors={packageErrors}
            defaultsConfirmed={defaultsConfirmed}
            onDefaultsConfirmedChange={onDefaultsConfirmedChange}
            defaultsConfirmedError={errors.defaultsConfirmed}
          />
          {extraCount > 0 && !addonsReviewed ? (
            <div className="cw-addon-nudge">
              <p className="cw-addon-nudge-title">Review your add-ons</p>
              <p className="cw-addon-nudge-copy">
                {mandatoryCount} add-on{mandatoryCount === 1 ? " is" : "s are"}{" "}
                already on for every order. Open Add-ons to check prices
                {extrasLabel ? ` — and extras like ${extrasLabel}` : ""}.
              </p>
              <button
                type="button"
                className="cw-addon-nudge-btn"
                onClick={() => {
                  setOpenId("addons");
                  onAddonsReviewed?.();
                }}
              >
                Review add-ons
              </button>
            </div>
          ) : null}
        </WizardAccordionSection>

        <WizardAccordionSection
          id="addons"
          title="Add-ons"
          complete={
            !addOnsLoading &&
            extraCount === 0 &&
            selectedAddOnSlugs.length > 0 &&
            !errors.addOnPrices
          }
          summary={addOnSummary}
          open={open === "addons"}
          onOpen={toggleSection}
        >
          <CatalogStatus
            loading={addOnsLoading}
            error={addOnsError}
            label="add-on options"
            onRetry={onAddOnsRetry}
          />

          {errors.addOnPrices ? (
            <p className="cw-field-warn">
              <AlertTriangle size={13} aria-hidden />
              {errors.addOnPrices}
            </p>
          ) : null}

          {!addOnsLoading && !addOnsError ? (
            <AddOnCatalogEditor
              options={addOnOptions}
              selectedSlugs={selectedAddOnSlugs}
              drafts={addOnDrafts}
              unmatchedNames={unmatchedNames}
              disabled={disabled}
              onToggle={onToggleAddOn}
              onDraftChange={onAddOnDraftChange}
            />
          ) : null}
        </WizardAccordionSection>
      </div>
    </div>
  );
}
