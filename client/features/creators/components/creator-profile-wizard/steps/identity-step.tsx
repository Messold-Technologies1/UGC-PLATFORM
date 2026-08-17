"use client";

import { Check } from "lucide-react";

import type {
  CreatorFacetDimension,
  CreatorFacetOption,
} from "@/features/creators/api/get-creator-facet-options";

import { REQUIRED_SECONDARY_NICHES } from "@/features/creators/hooks/creator-profile-form-utils";

import { OPEN_TO_OPTIONS } from "../wizard-config";

type NonLanguageDimension = Exclude<CreatorFacetDimension, "LANGUAGE">;
type SelectedFacets = Partial<Record<NonLanguageDimension, string[]>>;
type CustomLabels = Partial<Record<NonLanguageDimension, string>>;

const OTHER_SLUG = "other";

export type IdentityStepProps = {
  disabled: boolean;
  optionsByDimension: Partial<Record<CreatorFacetDimension, CreatorFacetOption[]>>;
  selectedFacets: SelectedFacets;
  onSelectSingleFacet: (dimension: NonLanguageDimension, slug: string) => void;
  primaryNiche: string;
  secondaryNiches: string[];
  onSetPrimaryNiche: (slug: string) => void;
  onToggleSecondaryNiche: (slug: string) => void;
  customFacetLabels: CustomLabels;
  onCustomFacetLabelChange: (
    dimension: NonLanguageDimension,
    value: string,
  ) => void;
  selectedRestrictions: string[];
  onToggleRestriction: (name: string) => void;
};

const SINGLE_FACETS: Array<{
  dimension: NonLanguageDimension;
  label: string;
  help: string;
}> = [
  {
    dimension: "CREATOR_TYPE",
    label: "What's your creator type?",
    help: "Pick the one that best describes you on camera.",
  },
  {
    dimension: "OCCUPATION",
    label: "What do you do besides creating?",
    help: "Your main occupation — it adds credibility with brands.",
  },
  {
    dimension: "APPEARANCE",
    label: "Appearance",
    help: "Helps brands find the right look for their product.",
  },
];

function Chip({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="pe-chip"
      data-selected={selected}
      disabled={disabled}
      onClick={onClick}
    >
      {selected ? (
        <span className="pe-chip-tick">
          <Check size={13} strokeWidth={3} />
        </span>
      ) : null}
      {label}
    </button>
  );
}

function OtherInput({
  dimension,
  value,
  disabled,
  onChange,
}: {
  dimension: NonLanguageDimension;
  value: string;
  disabled: boolean;
  onChange: (dimension: NonLanguageDimension, value: string) => void;
}) {
  return (
    <input
      type="text"
      className="cw-other-input"
      value={value}
      maxLength={40}
      disabled={disabled}
      placeholder="Type your own…"
      onChange={(e) => onChange(dimension, e.target.value)}
    />
  );
}

export function IdentityStep({
  disabled,
  optionsByDimension,
  selectedFacets,
  onSelectSingleFacet,
  primaryNiche,
  secondaryNiches,
  onSetPrimaryNiche,
  onToggleSecondaryNiche,
  customFacetLabels,
  onCustomFacetLabelChange,
  selectedRestrictions,
  onToggleRestriction,
}: IdentityStepProps) {
  const nicheOptions = optionsByDimension.CONTENT_CATEGORY ?? [];
  const secondaryFull = secondaryNiches.length >= REQUIRED_SECONDARY_NICHES;
  const nicheOtherSelected =
    primaryNiche === OTHER_SLUG || secondaryNiches.includes(OTHER_SLUG);

  return (
    <div className="cw-card">
      <div className="cw-facet-groups-stack">
        {/* ---- Niche: primary + secondary from the same list ---- */}
        <div className="cw-facet">
          <div className="cw-facet-label">
            <span>Your primary niche</span>
            <span className="cw-req">*</span>
          </div>
          <span className="cw-facet-help">
            The one thing you&apos;re best known for. Brands see this first.
          </span>
          <div className="pe-chips">
            {nicheOptions.map((opt) => (
              <Chip
                key={opt.slug}
                label={opt.label}
                selected={primaryNiche === opt.slug}
                disabled={disabled}
                onClick={() => onSetPrimaryNiche(opt.slug)}
              />
            ))}
          </div>
        </div>

        <div className="cw-facet">
          <div className="cw-facet-label">
            <span>Your secondary niches</span>
            <span className="cw-req">*</span>
            <span className="cw-facet-count">
              {secondaryNiches.length}/{REQUIRED_SECONDARY_NICHES}
            </span>
          </div>
          <span className="cw-facet-help">
            {primaryNiche
              ? `Pick ${REQUIRED_SECONDARY_NICHES} more areas you also create in.`
              : "Choose your primary niche first."}
          </span>
          <div className="pe-chips">
            {nicheOptions
              .filter((opt) => opt.slug !== primaryNiche)
              .map((opt) => {
                const isOn = secondaryNiches.includes(opt.slug);
                return (
                  <Chip
                    key={opt.slug}
                    label={opt.label}
                    selected={isOn}
                    disabled={
                      disabled ||
                      !primaryNiche ||
                      (!isOn && secondaryFull)
                    }
                    onClick={() => onToggleSecondaryNiche(opt.slug)}
                  />
                );
              })}
          </div>
          {nicheOtherSelected ? (
            <OtherInput
              dimension="CONTENT_CATEGORY"
              value={customFacetLabels.CONTENT_CATEGORY ?? ""}
              disabled={disabled}
              onChange={onCustomFacetLabelChange}
            />
          ) : null}
        </div>

        <div className="cw-hr cw-hr-soft" />

        {/* ---- Single-select identity facets ---- */}
        {SINGLE_FACETS.map(({ dimension, label, help }) => {
          const options = optionsByDimension[dimension] ?? [];
          if (options.length === 0) return null;
          const selected = (selectedFacets[dimension] ?? [])[0] ?? "";
          return (
            <div className="cw-facet" key={dimension}>
              <div className="cw-facet-label">
                <span>{label}</span>
                <span className="cw-req">*</span>
              </div>
              <span className="cw-facet-help">{help}</span>
              <div className="pe-chips">
                {options.map((opt) => (
                  <Chip
                    key={opt.slug}
                    label={opt.label}
                    selected={selected === opt.slug}
                    disabled={disabled}
                    onClick={() => onSelectSingleFacet(dimension, opt.slug)}
                  />
                ))}
              </div>
              {selected === OTHER_SLUG ? (
                <OtherInput
                  dimension={dimension}
                  value={customFacetLabels[dimension] ?? ""}
                  disabled={disabled}
                  onChange={onCustomFacetLabelChange}
                />
              ) : null}
            </div>
          );
        })}

        <div className="cw-hr cw-hr-soft" />

        {/* ---- Open to (required) ---- */}
        <div className="cw-facet">
          <div className="cw-facet-label">
            <span>Comfortable with</span>
            <span className="cw-req">*</span>
            {selectedRestrictions.length > 0 ? (
              <span className="cw-facet-count">
                {selectedRestrictions.length}
              </span>
            ) : null}
          </div>
          <span className="cw-facet-help">
            Pick the categories you&apos;re open to creating for so brands can
            match you to the right briefs. Select at least one.
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
    </div>
  );
}
