"use client";

import type { CreatorFacetDimension } from "@/features/creators/api/get-creator-facet-options";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";

import {
  IDENTITY_FACET_GROUPS,
  type WizardFacetGroup,
} from "../wizard-config";
import { FacetGroups } from "./wizard-parts";

type SelectedFacets = Partial<
  Record<Exclude<CreatorFacetDimension, "LANGUAGE">, string[]>
>;

export type IdentityStepProps = {
  disabled: boolean;
  optionsByDimension: Partial<Record<CreatorFacetDimension, CreatorFacetOption[]>>;
  selectedFacets: SelectedFacets;
  onToggleFacet: (group: WizardFacetGroup, slug: string) => void;
};

export function IdentityStep({
  disabled,
  optionsByDimension,
  selectedFacets,
  onToggleFacet,
}: IdentityStepProps) {
  return (
    <div className="cw-card">
      <FacetGroups
        groups={IDENTITY_FACET_GROUPS}
        optionsByDimension={optionsByDimension}
        selectedFacets={selectedFacets}
        disabled={disabled}
        onToggle={onToggleFacet}
      />
    </div>
  );
}
