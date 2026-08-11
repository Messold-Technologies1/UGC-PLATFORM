"use client";

import { Check } from "lucide-react";

import type { CreatorFacetDimension } from "@/features/creators/api/get-creator-facet-options";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";

import {
  IDENTITY_FACET_GROUPS,
  OPEN_TO_OPTIONS,
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
  selectedRestrictions: string[];
  onToggleRestriction: (name: string) => void;
};

export function IdentityStep({
  disabled,
  optionsByDimension,
  selectedFacets,
  onToggleFacet,
  selectedRestrictions,
  onToggleRestriction,
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

      <div className="cw-hr cw-hr-soft" />

      {/* Open to — sensitive categories the creator opts into (restrictions) */}
      <div className="cw-facet">
        <div className="cw-facet-label">
          <span>Open to</span>
          {selectedRestrictions.length > 0 ? (
            <span className="cw-facet-count">{selectedRestrictions.length}</span>
          ) : null}
        </div>
        <span className="cw-facet-help">
          Optional — sensitive categories you&apos;re comfortable creating for.
          Only shown to brands when you opt in.
        </span>
        <div className="pe-chips">
          {OPEN_TO_OPTIONS.map((name) => {
            const isOn = selectedRestrictions.includes(name);
            return (
              <button
                key={name}
                type="button"
                className="pe-chip"
                data-selected={isOn}
                disabled={disabled}
                onClick={() => onToggleRestriction(name)}
              >
                {isOn ? (
                  <span className="pe-chip-tick">
                    <Check size={13} strokeWidth={3} />
                  </span>
                ) : null}
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
