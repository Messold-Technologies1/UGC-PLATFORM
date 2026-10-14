"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles, X } from "lucide-react";

import type {
  CreatorFacetDimension,
  CreatorFacetOption,
} from "@/features/creators/api/get-creator-facet-options";

import { Switch } from "@/components/ui/switch";
import { REQUIRED_SECONDARY_NICHES } from "@/features/creators/hooks/creator-profile-form-utils";
import { cn } from "@/lib/utils";

import { OPEN_TO_OPTIONS } from "../wizard-config";
import {
  CwCard,
  CwFacet,
  CwFacetCount,
  CwFacetHelp,
  CwFacetLabel,
  CwFieldWarn,
  CwReq,
} from "../wizard-ui";
import { WizardAccordionSection } from "./wizard-parts";

type NonLanguageDimension = Exclude<CreatorFacetDimension, "LANGUAGE">;
type SelectedFacets = Partial<Record<NonLanguageDimension, string[]>>;
type CustomLabels = Partial<Record<NonLanguageDimension, string>>;

const OTHER_SLUG = "other";
/** How many chips to show before collapsing behind "+N more". */
const CHIP_PREVIEW_COUNT = 8;

type ChipOption = { slug: string; label: string };

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

const chipBaseClass =
  "inline-flex h-8 max-sm:h-10 items-center gap-1.5 rounded-full border-[1.4px] px-3 max-sm:px-3.5 text-[12.5px] max-sm:text-[13.5px] font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const selectAllClass =
  "ml-1 inline-flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-muted-foreground";

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
      className={[
        chipBaseClass,
        selected
          ? "border-primary bg-primary text-white"
          : "border-border bg-card text-foreground hover:border-primary/45",
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
    >
      {selected ? (
        <span className="grid place-items-center">
          <Check size={13} strokeWidth={3} />
        </span>
      ) : null}
      {label}
    </button>
  );
}

function ChipToggle({
  label,
  disabled,
  onClick,
  ariaLabel,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      className={[
        chipBaseClass,
        "border-dashed border-border bg-muted/55 font-bold text-muted-foreground",
        "hover:border-primary/40 hover:bg-muted/35 hover:text-foreground",
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {label}
    </button>
  );
}

/**
 * Chip grid: first 8 regular options, then "Other" (always visible), then
 * "+N more" / "Show less" to reveal the rest. Toggle chips use a distinct style.
 */
function CollapsibleChips({
  options,
  selectedSlugs,
  disabled,
  onSelect,
}: {
  options: ChipOption[];
  /** Current selection(s) — used to auto-expand when a pick is behind "+N more". */
  selectedSlugs: string[];
  disabled: boolean;
  onSelect: (slug: string) => void;
}) {
  const { regular, other } = useMemo(() => {
    const rest: ChipOption[] = [];
    let otherOpt: ChipOption | undefined;
    for (const opt of options) {
      if (opt.slug === OTHER_SLUG) otherOpt = opt;
      else rest.push(opt);
    }
    return { regular: rest, other: otherOpt };
  }, [options]);

  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, regular.length - CHIP_PREVIEW_COUNT);

  useEffect(() => {
    if (expanded || hiddenCount === 0) return;
    const preview = new Set(
      regular.slice(0, CHIP_PREVIEW_COUNT).map((opt) => opt.slug),
    );
    if (other) preview.add(other.slug);
    if (selectedSlugs.some((slug) => slug && !preview.has(slug))) {
      setExpanded(true);
    }
  }, [selectedSlugs, regular, other, expanded, hiddenCount]);

  const visibleRegular =
    expanded || hiddenCount === 0
      ? regular
      : regular.slice(0, CHIP_PREVIEW_COUNT);

  return (
    <div className="flex flex-wrap gap-[7px] max-sm:gap-2">
      {visibleRegular.map((opt) => (
        <Chip
          key={opt.slug}
          label={opt.label}
          selected={selectedSlugs.includes(opt.slug)}
          disabled={disabled}
          onClick={() => onSelect(opt.slug)}
        />
      ))}
      {other ? (
        <Chip
          key={other.slug}
          label={other.label}
          selected={selectedSlugs.includes(other.slug)}
          disabled={disabled}
          onClick={() => onSelect(other.slug)}
        />
      ) : null}
      {hiddenCount > 0 && !expanded ? (
        <ChipToggle
          label={`+${hiddenCount} more`}
          disabled={disabled}
          onClick={() => setExpanded(true)}
          ariaLabel={`Show ${hiddenCount} more options`}
        />
      ) : null}
      {hiddenCount > 0 && expanded ? (
        <ChipToggle
          label="Show less"
          disabled={disabled}
          onClick={() => setExpanded(false)}
          ariaLabel="Show fewer options"
        />
      ) : null}
    </div>
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
    <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
      <input
        type="text"
        className={cn(
          "w-full max-w-[360px] max-sm:max-w-full rounded-[10px] border border-border bg-card px-3 py-2.5 text-[13.5px] text-foreground outline-none",
          "focus:border-[color-mix(in_oklab,var(--primary)_55%,var(--border))] focus:shadow-[0_0_0_4px_var(--p10)]",
          "disabled:opacity-60",
        )}
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
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary">
          <Loader2 size={13} className="animate-spin" aria-hidden />
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
    <div
      className={cn(
        "mt-2.5 flex max-w-[480px] items-start gap-2 rounded-[10px] border px-[11px] py-2.5 text-[12.5px] leading-snug",
        notice.type === "info" &&
          "border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_7%,var(--background))] text-foreground [&_svg]:text-primary",
        notice.type === "warning" &&
          "border-[color-mix(in_oklab,var(--destructive)_30%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_8%,var(--background))] text-foreground [&_svg]:text-destructive",
      )}
      role="status"
    >
      {notice.type === "warning" ? (
        <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
      ) : (
        <Sparkles size={14} className="mt-px shrink-0" aria-hidden />
      )}
      <span>{notice.message}</span>
      <button
        type="button"
        className="ml-auto inline-flex shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0.5 text-muted-foreground hover:text-foreground"
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
    <CwCard className="max-[960px]:gap-3 max-[960px]:border-0 max-[960px]:bg-transparent max-[960px]:p-0 max-[960px]:shadow-none">
      <div className="flex flex-col gap-[26px] max-[960px]:gap-2.5">
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
          <CwFacet>
            <CwFacetLabel className="max-[960px]:hidden">
              <span className="inline-flex min-w-0 items-center gap-1">
                Your primary niche <CwReq />
              </span>
            </CwFacetLabel>
            <CwFacetHelp className="-mt-1 max-[960px]:text-xs">
              The one thing you&apos;re best known for. Brands see this first.
            </CwFacetHelp>
            <CollapsibleChips
              options={nicheOptions}
              selectedSlugs={primaryNiche ? [primaryNiche] : []}
              disabled={disabled}
              onSelect={onSetPrimaryNiche}
            />
            {errors.primaryNiche ? (
              <CwFieldWarn>
                <AlertTriangle
                  size={13}
                  className="mt-px shrink-0 text-amber-600"
                  aria-hidden
                />
                {errors.primaryNiche}
              </CwFieldWarn>
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
          </CwFacet>
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
          <CwFacet>
            <CwFacetLabel className="max-[960px]:hidden">
              <span className="inline-flex min-w-0 items-center gap-1">
                Your secondary niches <CwReq />
              </span>
              <CwFacetCount className="ml-auto">
                {secondaryNiches.length}/{REQUIRED_SECONDARY_NICHES}
              </CwFacetCount>
            </CwFacetLabel>
            <CwFacetHelp className="-mt-1 max-[960px]:text-xs">
              {primaryNiche
                ? `Pick ${REQUIRED_SECONDARY_NICHES} more areas you also create in.`
                : "Choose your primary niche first."}
            </CwFacetHelp>
            <CollapsibleChips
              options={nicheOptions.filter((opt) => opt.slug !== primaryNiche)}
              selectedSlugs={secondaryNiches}
              disabled={disabled || !primaryNiche}
              onSelect={onToggleSecondaryNiche}
            />
            {errors.secondaryNiches ? (
              <CwFieldWarn>
                <AlertTriangle
                  size={13}
                  className="mt-px shrink-0 text-amber-600"
                  aria-hidden
                />
                {errors.secondaryNiches}
              </CwFieldWarn>
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
          </CwFacet>
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
              <CwFacet>
                <CwFacetLabel className="max-[960px]:hidden">
                  <span className="inline-flex min-w-0 items-center gap-1">
                    {label} <CwReq />
                  </span>
                </CwFacetLabel>
                <CwFacetHelp className="-mt-1 max-[960px]:text-xs">
                  {help}
                </CwFacetHelp>
                <CollapsibleChips
                  options={options}
                  selectedSlugs={selected ? [selected] : []}
                  disabled={disabled}
                  onSelect={(slug) => onSelectSingleFacet(dimension, slug)}
                />
                {dimErr ? (
                  <CwFieldWarn>
                    <AlertTriangle
                      size={13}
                      className="mt-px shrink-0 text-amber-600"
                      aria-hidden
                    />
                    {dimErr}
                  </CwFieldWarn>
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
              </CwFacet>
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
            <label className={cn(selectAllClass, "ml-0 text-[11px]")}>
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
          <CwFacet>
            <CwFacetLabel className="max-[960px]:hidden">
              <span className="inline-flex min-w-0 items-center gap-1">
                Comfortable with
              </span>
              <label className={selectAllClass}>
                <span>Select all</span>
                <Switch
                  checked={allRestrictionsSelected}
                  disabled={disabled}
                  onCheckedChange={onSetAllRestrictions}
                  aria-label="Select all Comfortable with options"
                />
              </label>
              {selectedRestrictions.length > 0 ? (
                <CwFacetCount className="ml-auto">
                  {selectedRestrictions.length}
                </CwFacetCount>
              ) : null}
            </CwFacetLabel>
            <CwFacetHelp className="-mt-1 max-[960px]:text-xs">
              Optional — skip if none apply. Pick the categories you&apos;re open
              to creating for so brands can match you to the right briefs.
            </CwFacetHelp>
            <CollapsibleChips
              options={OPEN_TO_OPTIONS.map((name) => ({
                slug: name,
                label: name,
              }))}
              selectedSlugs={selectedRestrictions}
              disabled={disabled}
              onSelect={onToggleRestriction}
            />
          </CwFacet>
        </WizardAccordionSection>
      </div>
    </CwCard>
  );
}
