"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles, X } from "lucide-react";

import type {
  CreatorFacetDimension,
  CreatorFacetOption,
} from "@/features/creators/api/get-creator-facet-options";

import { Switch } from "@/components/ui/switch";
import { REQUIRED_SECONDARY_NICHES } from "@/features/creators/hooks/creator-profile-form-utils";

import { OPEN_TO_OPTIONS } from "../wizard-config";
import { WizardAccordionSection } from "./wizard-parts";

type NonLanguageDimension = Exclude<CreatorFacetDimension, "LANGUAGE">;
type SelectedFacets = Partial<Record<NonLanguageDimension, string[]>>;
type CustomLabels = Partial<Record<NonLanguageDimension, string>>;

const OTHER_SLUG = "other";

export type OtherNotice = { type: "info" | "warning"; message: string };
export type OtherNotices = Partial<Record<NonLanguageDimension, OtherNotice>>;

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
  onCommitOther: (dimension: NonLanguageDimension) => void;
  resolvingOtherDim: NonLanguageDimension | null;
  otherNotices: OtherNotices;
  onDismissOtherNotice: (dimension: NonLanguageDimension) => void;
  selectedRestrictions: string[];
  onToggleRestriction: (name: string) => void;
  onSetAllRestrictions: (selected: boolean) => void;
  errors?: {
    primaryNiche?: string;
    secondaryNiches?: string;
    creatorType?: string;
    occupation?: string;
    appearance?: string;
    restrictions?: string;
    blankOther?: string;
  };
};

const SINGLE_FACETS: Array<{
  dimension: "CREATOR_TYPE" | "OCCUPATION" | "APPEARANCE";
  label: string;
  shortLabel: string;
  help: string;
}> = [
  {
    dimension: "CREATOR_TYPE",
    label: "What's your creator type?",
    shortLabel: "Creator type",
    help: "Pick the one that best describes you on camera.",
  },
  {
    dimension: "OCCUPATION",
    label: "What do you do besides creating?",
    shortLabel: "Occupation",
    help: "Your main occupation — it adds credibility with brands.",
  },
  {
    dimension: "APPEARANCE",
    label: "Appearance",
    shortLabel: "Appearance",
    help: "Helps brands find the right look for their product.",
  },
];

type IdentitySectionId =
  | "primary"
  | "secondary"
  | "creator-type"
  | "occupation"
  | "appearance"
  | "comfortable";

const FACET_SECTION_ID: Record<
  "CREATOR_TYPE" | "OCCUPATION" | "APPEARANCE",
  IdentitySectionId
> = {
  CREATOR_TYPE: "creator-type",
  OCCUPATION: "occupation",
  APPEARANCE: "appearance",
};

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

function OtherField({
  dimension,
  value,
  disabled,
  resolving,
  onChange,
  onCommit,
}: {
  dimension: NonLanguageDimension;
  value: string;
  disabled: boolean;
  resolving: boolean;
  onChange: (dimension: NonLanguageDimension, value: string) => void;
  onCommit: (dimension: NonLanguageDimension) => void;
}) {
  return (
    <div className="cw-other-row">
      <input
        type="text"
        className="cw-other-input"
        value={value}
        maxLength={40}
        disabled={disabled || resolving}
        placeholder="Type your own…"
        onChange={(e) => onChange(dimension, e.target.value)}
        onBlur={() => onCommit(dimension)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      {resolving ? (
        <span className="cw-other-checking">
          <Loader2 size={13} className="cw-ai-spin" aria-hidden />
          Checking…
        </span>
      ) : null}
    </div>
  );
}

/**
 * The "why we mapped / we'll add on save" banner. Rendered at the facet level —
 * NOT inside OtherField — so it stays visible after a match auto-selects the
 * real chip and the "Other" input unmounts.
 */
function FacetOtherNotice({
  dimension,
  notice,
  onDismiss,
}: {
  dimension: NonLanguageDimension;
  notice?: OtherNotice;
  onDismiss: (dimension: NonLanguageDimension) => void;
}) {
  if (!notice) return null;
  return (
    <div className="cw-other-notice" data-type={notice.type} role="status">
      {notice.type === "warning" ? (
        <AlertTriangle size={14} aria-hidden />
      ) : (
        <Sparkles size={14} aria-hidden />
      )}
      <span>{notice.message}</span>
      <button
        type="button"
        className="cw-other-notice-x"
        onClick={() => onDismiss(dimension)}
        aria-label="Dismiss"
      >
        <X size={13} aria-hidden />
      </button>
    </div>
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
  onCommitOther,
  resolvingOtherDim,
  otherNotices,
  onDismissOtherNotice,
  selectedRestrictions,
  onToggleRestriction,
  onSetAllRestrictions,
  errors = {},
}: IdentityStepProps) {
  const nicheOptions = optionsByDimension.CONTENT_CATEGORY ?? [];
  const primaryOtherSelected = primaryNiche === OTHER_SLUG;
  const secondaryOtherSelected = secondaryNiches.includes(OTHER_SLUG);
  const allRestrictionsSelected =
    OPEN_TO_OPTIONS.length > 0 &&
    OPEN_TO_OPTIONS.every((name) => selectedRestrictions.includes(name));
  const nicheLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of nicheOptions) map.set(opt.slug, opt.label);
    return map;
  }, [nicheOptions]);
  const facetLabel = (dimension: NonLanguageDimension, slug: string) =>
    (optionsByDimension[dimension] ?? []).find((opt) => opt.slug === slug)
      ?.label ?? slug;

  const firstIncomplete = ((): IdentitySectionId => {
    if (!primaryNiche) return "primary";
    if (secondaryNiches.length < REQUIRED_SECONDARY_NICHES) return "secondary";
    if (!(selectedFacets.CREATOR_TYPE ?? [])[0]) return "creator-type";
    if (!(selectedFacets.OCCUPATION ?? [])[0]) return "occupation";
    if (!(selectedFacets.APPEARANCE ?? [])[0]) return "appearance";
    return "primary";
  })();
  const firstError = ((): IdentitySectionId | null => {
    if (errors.primaryNiche) return "primary";
    if (errors.secondaryNiches) return "secondary";
    if (errors.creatorType) return "creator-type";
    if (errors.occupation) return "occupation";
    if (errors.appearance) return "appearance";
    if (errors.restrictions) return "comfortable";
    return null;
  })();

  const [openId, setOpenId] = useState<IdentitySectionId | "closed" | null>(
    null,
  );
  const fallback = firstError ?? firstIncomplete;
  const open = openId === "closed" ? null : (openId ?? fallback);

  function toggleSection(id: string) {
    setOpenId((current) => {
      const resolved = current === "closed" ? null : (current ?? fallback);
      return resolved === id ? "closed" : (id as IdentitySectionId);
    });
  }

  useEffect(() => {
    if (!firstError) return;
    setOpenId(firstError);
  }, [firstError]);

  return (
    <div className="cw-card">
      <div className="cw-facet-groups-stack cw-acc-stack">
        <WizardAccordionSection
          id="primary"
          title="Primary niche"
          required
          complete={Boolean(primaryNiche)}
          summary={
            primaryNiche
              ? nicheLabelBySlug.get(primaryNiche) ?? primaryNiche
              : undefined
          }
          open={open === "primary"}
          onOpen={toggleSection}
        >
        {/* ---- Niche: primary + secondary from the same list ---- */}
        <div className="cw-facet">
          <div className="cw-facet-label">
            <span>
              Your primary niche
              <span className="cw-req"> *</span>
            </span>
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
          {errors.primaryNiche ? (
            <p className="cw-field-warn"><AlertTriangle size={13} aria-hidden />{errors.primaryNiche}</p>
          ) : null}
          {primaryOtherSelected ? (
            <OtherField
              dimension="CONTENT_CATEGORY"
              value={customFacetLabels.CONTENT_CATEGORY ?? ""}
              disabled={disabled}
              resolving={resolvingOtherDim === "CONTENT_CATEGORY"}
              onChange={onCustomFacetLabelChange}
              onCommit={onCommitOther}
            />
          ) : null}
        </div>
        </WizardAccordionSection>

        <WizardAccordionSection
          id="secondary"
          title="Secondary niches"
          required
          complete={secondaryNiches.length >= REQUIRED_SECONDARY_NICHES}
          summary={
            secondaryNiches.length > 0
              ? `${secondaryNiches
                  .map((slug) => nicheLabelBySlug.get(slug) ?? slug)
                  .join(", ")} (${secondaryNiches.length}/${REQUIRED_SECONDARY_NICHES})`
              : `${secondaryNiches.length}/${REQUIRED_SECONDARY_NICHES}`
          }
          open={open === "secondary"}
          onOpen={toggleSection}
        >
        <div className="cw-facet">
          <div className="cw-facet-label">
            <span>
              Your secondary niches
              <span className="cw-req"> *</span>
            </span>
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
                    disabled={disabled || !primaryNiche}
                    onClick={() => onToggleSecondaryNiche(opt.slug)}
                  />
                );
              })}
          </div>
          {errors.secondaryNiches ? (
            <p className="cw-field-warn"><AlertTriangle size={13} aria-hidden />{errors.secondaryNiches}</p>
          ) : null}
          {secondaryOtherSelected ? (
            <OtherField
              dimension="CONTENT_CATEGORY"
              value={customFacetLabels.CONTENT_CATEGORY ?? ""}
              disabled={disabled}
              resolving={resolvingOtherDim === "CONTENT_CATEGORY"}
              onChange={onCustomFacetLabelChange}
              onCommit={onCommitOther}
            />
          ) : null}
          <FacetOtherNotice
            dimension="CONTENT_CATEGORY"
            notice={otherNotices.CONTENT_CATEGORY}
            onDismiss={onDismissOtherNotice}
          />
        </div>
        </WizardAccordionSection>

        {/* ---- Single-select identity facets ---- */}
        {SINGLE_FACETS.map(({ dimension, label, shortLabel, help }) => {
          const options = optionsByDimension[dimension] ?? [];
          if (options.length === 0) return null;
          const selected = (selectedFacets[dimension] ?? [])[0] ?? "";
          const sectionId = FACET_SECTION_ID[dimension];
          const dimErr =
            dimension === "CREATOR_TYPE"
              ? errors.creatorType
              : dimension === "OCCUPATION"
                ? errors.occupation
                : dimension === "APPEARANCE"
                  ? errors.appearance
                  : undefined;
          return (
            <WizardAccordionSection
              key={dimension}
              id={sectionId}
              title={shortLabel}
              required
              complete={Boolean(selected)}
              summary={selected ? facetLabel(dimension, selected) : undefined}
              open={open === sectionId}
              onOpen={toggleSection}
            >
            <div className="cw-facet">
              <div className="cw-facet-label">
                <span>
                  {label}
                  <span className="cw-req"> *</span>
                </span>
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
              {dimErr ? (
                <p className="cw-field-warn"><AlertTriangle size={13} aria-hidden />{dimErr}</p>
              ) : null}
              {selected === OTHER_SLUG ? (
                <OtherField
                  dimension={dimension}
                  value={customFacetLabels[dimension] ?? ""}
                  disabled={disabled}
                  resolving={resolvingOtherDim === dimension}
                  onChange={onCustomFacetLabelChange}
                  onCommit={onCommitOther}
                />
              ) : null}
              <FacetOtherNotice
                dimension={dimension}
                notice={otherNotices[dimension]}
                onDismiss={onDismissOtherNotice}
              />
            </div>
            </WizardAccordionSection>
          );
        })}

        <WizardAccordionSection
          id="comfortable"
          title="Comfortable with"
          complete={selectedRestrictions.length > 0}
          summary={
            selectedRestrictions.length > 0
              ? selectedRestrictions.join(", ")
              : undefined
          }
          open={open === "comfortable"}
          onOpen={toggleSection}
          extra={
            <label className="cw-facet-select-all">
              <span>All</span>
              <Switch
                checked={allRestrictionsSelected}
                disabled={disabled}
                onCheckedChange={onSetAllRestrictions}
                aria-label="Select all Comfortable with options"
              />
            </label>
          }
        >
        <div className="cw-facet">
          <div className="cw-facet-label">
            <span>
              Comfortable with
            </span>
            <label className="cw-facet-select-all">
              <span>Select all</span>
              <Switch
                checked={allRestrictionsSelected}
                disabled={disabled}
                onCheckedChange={onSetAllRestrictions}
                aria-label="Select all Comfortable with options"
              />
            </label>
            {selectedRestrictions.length > 0 ? (
              <span className="cw-facet-count">
                {selectedRestrictions.length}
              </span>
            ) : null}
          </div>
          <span className="cw-facet-help">
            Pick the categories you&apos;re open to creating for so brands can
            match you to the right briefs. Optional — skip if none apply.
          </span>
          {errors.restrictions ? (
            <p className="cw-field-warn"><AlertTriangle size={13} aria-hidden />{errors.restrictions}</p>
          ) : null}
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
        </WizardAccordionSection>
      </div>
    </div>
  );
}
