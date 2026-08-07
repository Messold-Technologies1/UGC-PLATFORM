"use client";

import { CatalogStatus } from "@/features/creators/components/creator-profile-update/shared-components";
import {
  PackageEditor,
  AddOnCatalogEditor,
} from "@/features/creators/components/creator-profile-update/package-and-addon-editors";
import { PackageEarningsBanner } from "@/features/creators/components/creator-profile-update/package-earnings-banner";
import type { PackageDraft, AddOnDraft } from "@/features/creators/hooks/creator-profile-form-utils";
import type { CreatorAddOnOption } from "@/features/creators/api/get-creator-add-on-options";

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
  packageDeliveryDays: number | null;
  addOnsLoading: boolean;
  addOnsError: boolean;
  onAddOnsRetry: () => void;
  onToggleAddOn: (option: CreatorAddOnOption) => void;
  onAddOnDraftChange: (slug: string, patch: Partial<AddOnDraft>) => void;
};

export function PricingStep({
  disabled,
  packageDraft,
  onPackageChange,
  packageErrors,
  addOnOptions,
  selectedAddOnSlugs,
  addOnDrafts,
  unmatchedNames,
  packageDeliveryDays,
  addOnsLoading,
  addOnsError,
  onAddOnsRetry,
  onToggleAddOn,
  onAddOnDraftChange,
}: PricingStepProps) {
  return (
    <div className="cw-card">
      <PackageEarningsBanner
        packagePriceAmount={packageDraft.priceAmount}
        selectedAddOnSlugs={selectedAddOnSlugs}
        addOnDrafts={addOnDrafts}
      />

      <PackageEditor
        draft={packageDraft}
        disabled={disabled}
        onChange={onPackageChange}
        errors={packageErrors}
      />

      <div className="cw-hr" />

      <CatalogStatus
        loading={addOnsLoading}
        error={addOnsError}
        label="add-on options"
        onRetry={onAddOnsRetry}
      />

      {!addOnsLoading && !addOnsError ? (
        <AddOnCatalogEditor
          options={addOnOptions}
          selectedSlugs={selectedAddOnSlugs}
          drafts={addOnDrafts}
          unmatchedNames={unmatchedNames}
          disabled={disabled}
          packageDeliveryDays={packageDeliveryDays}
          onToggle={onToggleAddOn}
          onDraftChange={onAddOnDraftChange}
        />
      ) : null}
    </div>
  );
}
