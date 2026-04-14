"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { SuggestionChips } from "@/components/ui/suggestion-chips";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  usePortfolioIndustrySuggestionsQuery,
  usePortfolioTagSuggestionsQuery,
} from "@/features/creator-portfolio/hooks/use-portfolio-suggestion-queries";
import {
  useCreatorCategorySuggestionsQuery,
  useCreatorPersonaTagSuggestionsQuery,
  useCreatorRestrictionSuggestionsQuery,
} from "../hooks/use-creator-suggestion-queries";

export const CREATOR_PRICE_MIN = 0;
export const CREATOR_PRICE_MAX = 10_000;
const PRICE_STEP = 500;
const DEFAULT_OPEN_SECTIONS: string[] = [];

const GENDER_OPTIONS = [
  {
    value: "Male",
    label: "Male",
    description: "Show creators who identify as male.",
  },
  {
    value: "Female",
    label: "Female",
    description: "Show creators who identify as female.",
  },
  {
    value: "Other",
    label: "Other",
    description: "Include creators using any other gender label.",
  },
] as const;

export interface Filters {
  city: string;
  categories: string[];
  gender: string;
  minPrice: string;
  maxPrice: string;
  onLocationAvailable: boolean;
  industry: string;
  portfolioTag: string;
  personaTags: string[];
  restrictions: string[];
}

export const DEFAULT_FILTERS: Filters = {
  city: "",
  categories: [],
  gender: "",
  minPrice: "",
  maxPrice: "",
  onLocationAvailable: false,
  industry: "",
  portfolioTag: "",
  personaTags: [],
  restrictions: [],
};

interface CreatorFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClose: () => void;
  categoryOptions: string[];
}

function normalizeSelectedValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function summarizeSelection(values: string[], emptyLabel: string) {
  if (values.length === 0) return emptyLabel;
  if (values.length === 1) return values[0]!;
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values[0]}, ${values[1]} +${values.length - 2}`;
}

export const CreatorFilters = memo(function CreatorFilters({
  filters,
  onChange,
  onClose,
  categoryOptions,
}: CreatorFiltersProps) {
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const [localCity, setLocalCity] = useState(filters.city);
  const [localIndustry, setLocalIndustry] = useState(filters.industry);
  const [localPortfolioTag, setLocalPortfolioTag] = useState(filters.portfolioTag);
  const [priceDraft, setPriceDraft] = useState<[number, number]>([
    filters.minPrice ? Number(filters.minPrice) : CREATOR_PRICE_MIN,
    filters.maxPrice ? Number(filters.maxPrice) : CREATOR_PRICE_MAX,
  ]);

  useEffect(() => {
    setLocalCity(filters.city);
  }, [filters.city]);

  useEffect(() => {
    setLocalIndustry(filters.industry);
  }, [filters.industry]);

  useEffect(() => {
    setLocalPortfolioTag(filters.portfolioTag);
  }, [filters.portfolioTag]);

  useEffect(() => {
    setPriceDraft([
      filters.minPrice ? Number(filters.minPrice) : CREATOR_PRICE_MIN,
      filters.maxPrice ? Number(filters.maxPrice) : CREATOR_PRICE_MAX,
    ]);
  }, [filters.minPrice, filters.maxPrice]);

  const categorySuggestionsQuery = useCreatorCategorySuggestionsQuery({
    staleTime: 5 * 60_000,
  });

  const personaSuggestionsQuery = useCreatorPersonaTagSuggestionsQuery({
    staleTime: 5 * 60_000,
  });

  const restrictionSuggestionsQuery = useCreatorRestrictionSuggestionsQuery({
    staleTime: 5 * 60_000,
  });

  const industrySuggestionsQuery = usePortfolioIndustrySuggestionsQuery({
    staleTime: 5 * 60_000,
  });

  const portfolioTagSuggestionsQuery = usePortfolioTagSuggestionsQuery({
    staleTime: 5 * 60_000,
  });

  const handleChange = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      const nextFilters = { ...filtersRef.current, [key]: value };
      filtersRef.current = nextFilters;
      onChange(nextFilters);
    },
    [onChange],
  );

  const debouncedCityChange = useDebouncedCallback((value: string) => {
    handleChange("city", value.trim());
  }, 400);

  const debouncedIndustryChange = useDebouncedCallback((value: string) => {
    handleChange("industry", value.trim());
  }, 400);

  const debouncedPortfolioTagChange = useDebouncedCallback((value: string) => {
    handleChange("portfolioTag", value.trim());
  }, 400);

  const toggleMultiSelect = useCallback(
    (key: "categories" | "personaTags" | "restrictions", value: string) => {
      const currentValues = filtersRef.current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : normalizeSelectedValues([...currentValues, value]);
      handleChange(key, nextValues);
    },
    [handleChange],
  );

  const handlePriceCommit = useCallback(
    ([min, max]: number[]) => {
      const nextFilters = {
        ...filtersRef.current,
        minPrice: min <= CREATOR_PRICE_MIN ? "" : String(min),
        maxPrice: max >= CREATOR_PRICE_MAX ? "" : String(max),
      };
      filtersRef.current = nextFilters;
      onChange(nextFilters);
    },
    [onChange],
  );

  const categorySummary = useMemo(
    () => summarizeSelection(filters.categories, "Any category"),
    [filters.categories],
  );
  const personaSummary = useMemo(
    () => summarizeSelection(filters.personaTags, "Any persona tag"),
    [filters.personaTags],
  );
  const restrictionSummary = useMemo(
    () => summarizeSelection(filters.restrictions, "Any restriction"),
    [filters.restrictions],
  );
  const locationSummary = useMemo(
    () => filters.city.trim() || "Any location",
    [filters.city],
  );
  const genderSummary = useMemo(() => {
    return (
      GENDER_OPTIONS.find((option) => option.value === filters.gender)?.label ??
      "Any gender"
    );
  }, [filters.gender]);
  const videoSummary = useMemo(() => {
    const parts = [filters.industry.trim(), filters.portfolioTag.trim()].filter(
      Boolean,
    );
    if (parts.length === 0) return "Industry and video tag";
    return parts.join(" • ");
  }, [filters.industry, filters.portfolioTag]);

  const priceSummary = useMemo(() => {
    const [min, max] = priceDraft;
    const hiLabel =
      max >= CREATOR_PRICE_MAX ? "₹10,000+" : `₹${max.toLocaleString("en-IN")}`;
    return `₹${min.toLocaleString("en-IN")} - ${hiLabel}`;
  }, [priceDraft]);

  const priceAction = (
    <span
      className={cn(
        "text-xs font-semibold tabular-nums",
        filters.minPrice || filters.maxPrice
          ? "text-foreground"
          : "text-muted-foreground",
      )}
    >
      {priceSummary}
    </span>
  );

  const categoryNames = useMemo(() => {
    const fromQuery =
      categorySuggestionsQuery.data?.map((item) => item.name.trim()).filter(Boolean) ??
      [];
    const fallback = categoryOptions.map((item) => item.trim()).filter(Boolean);
    return normalizeSelectedValues([...fromQuery, ...fallback]);
  }, [categoryOptions, categorySuggestionsQuery.data]);

  const personaNames = useMemo(
    () =>
      normalizeSelectedValues(
        (personaSuggestionsQuery.data ?? []).map((item) => item.name),
      ),
    [personaSuggestionsQuery.data],
  );

  const restrictionNames = useMemo(
    () =>
      normalizeSelectedValues(
        (restrictionSuggestionsQuery.data ?? []).map((item) => item.name),
      ),
    [restrictionSuggestionsQuery.data],
  );

  const industryChipItems = useMemo(
    () =>
      (industrySuggestionsQuery.data ?? []).slice(0, 8).map((label) => ({
        key: label,
        label,
      })),
    [industrySuggestionsQuery.data],
  );

  const portfolioTagChipItems = useMemo(
    () =>
      (portfolioTagSuggestionsQuery.data ?? []).slice(0, 10).map((label) => ({
        key: label,
        label,
      })),
    [portfolioTagSuggestionsQuery.data],
  );

  return (
    <aside className="flex h-full min-h-72 w-full max-w-full flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/95 shadow-[0_18px_54px_-30px_rgba(15,23,42,0.45)] backdrop-blur lg:h-auto lg:min-h-80 lg:max-h-[calc(100svh-var(--creators-filter-top)-var(--creators-filter-gap)-5rem)]">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 bg-muted/20 px-5 py-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Filters
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Refine creators using the exact filters supported by the API.
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close filters"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close filters</TooltipContent>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
        <div className="space-y-3">
          <Accordion
            type="multiple"
            defaultValue={DEFAULT_OPEN_SECTIONS}
            className="space-y-3"
          >
            <DropdownFilterSection
              value="video-based"
              label="Video based"
              summary={videoSummary}
              selectedCount={
                Number(Boolean(filters.industry)) +
                Number(Boolean(filters.portfolioTag))
              }
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Industry</p>
                  <Input
                    placeholder="Search by portfolio industry"
                    value={localIndustry}
                    onChange={(event) => {
                      setLocalIndustry(event.target.value);
                      debouncedIndustryChange(event.target.value);
                    }}
                    className="h-9 rounded-xl border-border/70 bg-background text-sm"
                  />
                  <SuggestionChips
                    items={industryChipItems}
                    selectedLabels={filters.industry ? [filters.industry] : []}
                    onSelect={(label, nextSelected) => {
                      const nextValue = nextSelected ? label : "";
                      setLocalIndustry(nextValue);
                      handleChange("industry", nextValue);
                    }}
                  />
                </div>

                <Separator className="bg-border/70" />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Tags</p>
                  <Input
                    placeholder="Search by portfolio tag"
                    value={localPortfolioTag}
                    onChange={(event) => {
                      setLocalPortfolioTag(event.target.value);
                      debouncedPortfolioTagChange(event.target.value);
                    }}
                    className="h-9 rounded-xl border-border/70 bg-background text-sm"
                  />
                  <SuggestionChips
                    items={portfolioTagChipItems}
                    selectedLabels={
                      filters.portfolioTag ? [filters.portfolioTag] : []
                    }
                    onSelect={(label, nextSelected) => {
                      const nextValue = nextSelected ? label : "";
                      setLocalPortfolioTag(nextValue);
                      handleChange("portfolioTag", nextValue);
                    }}
                  />
                </div>
              </div>
            </DropdownFilterSection>

            <DropdownFilterSection
              value="category"
              label="Category"
              summary={categorySummary}
              selectedCount={filters.categories.length}
            >
              <SectionToolbar
                helperText="Categories use OR matching on the API."
                onClear={
                  filters.categories.length > 0
                    ? () => handleChange("categories", [])
                    : undefined
                }
              />
              {categoryNames.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No category suggestions are available right now.
                </p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {categoryNames.map((category) => (
                    <CheckboxItem
                      key={category}
                      label={category}
                      checked={filters.categories.includes(category)}
                      onChange={() => toggleMultiSelect("categories", category)}
                    />
                  ))}
                </div>
              )}
            </DropdownFilterSection>

            <DropdownFilterSection
              value="location"
              label="Location"
              summary={locationSummary}
              selectedCount={filters.city ? 1 : 0}
            >
              <SectionToolbar
                helperText="City uses case-insensitive substring matching."
                onClear={
                  filters.city
                    ? () => {
                        setLocalCity("");
                        handleChange("city", "");
                      }
                    : undefined
                }
              />
              <Input
                placeholder="e.g. Mumbai, Bengaluru, Delhi"
                value={localCity}
                onChange={(event) => {
                  setLocalCity(event.target.value);
                  debouncedCityChange(event.target.value);
                }}
                className="h-9 rounded-xl border-border/70 bg-background text-sm"
              />
            </DropdownFilterSection>

            <DropdownFilterSection
              value="gender"
              label="Gender"
              summary={genderSummary}
              selectedCount={filters.gender ? 1 : 0}
            >
              <SectionToolbar helperText="Choose one gender filter or leave it unset." />
              <div className="space-y-2">
                {GENDER_OPTIONS.map((option) => (
                  <ChoiceItem
                    key={option.value}
                    label={option.label}
                    description={option.description}
                    isActive={filters.gender === option.value}
                    onClick={() =>
                      handleChange(
                        "gender",
                        filters.gender === option.value ? "" : option.value,
                      )
                    }
                  />
                ))}
              </div>
            </DropdownFilterSection>

            <DropdownFilterSection
              value="persona-tags"
              label="Persona tags"
              summary={personaSummary}
              selectedCount={filters.personaTags.length}
            >
              <SectionToolbar
                helperText="Matches creators with any selected persona tag."
                onClear={
                  filters.personaTags.length > 0
                    ? () => handleChange("personaTags", [])
                    : undefined
                }
              />
              {personaNames.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No persona tag suggestions are available right now.
                </p>
              ) : (
                <SuggestionChips
                  items={personaNames.map((label) => ({ key: label, label }))}
                  selectedLabels={filters.personaTags}
                  onSelect={(label) => toggleMultiSelect("personaTags", label)}
                />
              )}
            </DropdownFilterSection>

            <DropdownFilterSection
              value="restrictions"
              label="Restrictions"
              summary={restrictionSummary}
              selectedCount={filters.restrictions.length}
            >
              <SectionToolbar
                helperText="Matches creators with any selected restriction."
                onClear={
                  filters.restrictions.length > 0
                    ? () => handleChange("restrictions", [])
                    : undefined
                }
              />
              {restrictionNames.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No restriction suggestions are available right now.
                </p>
              ) : (
                <SuggestionChips
                  items={restrictionNames.map((label) => ({ key: label, label }))}
                  selectedLabels={filters.restrictions}
                  onSelect={(label) => toggleMultiSelect("restrictions", label)}
                />
              )}
            </DropdownFilterSection>
          </Accordion>

          <Separator className="bg-border/70" />

          <FilterSection label="Price range" action={priceAction}>
            <div className="space-y-4 pt-1">
              <div className="mx-auto w-full max-w-xs">
                <Slider
                  min={CREATOR_PRICE_MIN}
                  max={CREATOR_PRICE_MAX}
                  step={PRICE_STEP}
                  value={priceDraft}
                  onValueChange={(value) =>
                    setPriceDraft([value[0] ?? CREATOR_PRICE_MIN, value[1] ?? CREATOR_PRICE_MAX])
                  }
                  onValueCommit={handlePriceCommit}
                  trackClassName="h-1"
                  rangeClassName="bg-primary"
                  thumbClassName="size-3 border-primary/90 bg-background shadow-sm"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>₹{CREATOR_PRICE_MIN.toLocaleString("en-IN")}</span>
                <span>₹10,000+</span>
              </div>
            </div>
          </FilterSection>

          <FilterSection label="On-location availability">
            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/35 px-3.5 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-none text-foreground">
                  {filters.onLocationAvailable ? "Enabled" : "Disabled"}
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground">
                  Only creators marked available for on-location work
                </p>
              </div>
              <Switch
                checked={filters.onLocationAvailable}
                onCheckedChange={(checked) =>
                  handleChange("onLocationAvailable", checked)
                }
              />
            </div>
          </FilterSection>
        </div>
      </div>
    </aside>
  );
});

const FilterSection = memo(function FilterSection({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-background/90 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {action}
      </div>
      {children}
    </section>
  );
});

const DropdownFilterSection = memo(function DropdownFilterSection({
  value,
  label,
  summary,
  selectedCount,
  children,
}: {
  value: string;
  label: string;
  summary: string;
  selectedCount: number;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className="overflow-hidden rounded-2xl border border-border/70 bg-background/90 shadow-sm"
    >
      <AccordionTrigger className="px-4 py-3.5 hover:no-underline">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {selectedCount > 0 ? (
              <Badge
                variant="secondary"
                className="rounded-full px-2 py-0 text-[10px]"
              >
                {selectedCount}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {summary}
          </p>
        </div>
        <ChevronDown className="chevron size-4 text-muted-foreground transition-transform duration-200" />
      </AccordionTrigger>
      <AccordionContent className="border-t border-border/70 px-4 pb-4 pt-3">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
});

const SectionToolbar = memo(function SectionToolbar({
  helperText,
  onClear,
}: {
  helperText: string;
  onClear?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">{helperText}</p>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
});

const CheckboxItem = memo(function CheckboxItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
        checked
          ? "border-primary/45 bg-primary/10 shadow-sm"
          : "border-border/70 bg-background hover:bg-muted/45",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/35 bg-background",
          )}
        >
          {checked ? (
            <svg className="size-3" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6L5 8.5L9.5 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
        <span className="truncate text-sm font-medium text-foreground">
          {label}
        </span>
      </div>
      {checked ? (
        <span className="text-[11px] font-medium text-primary">Selected</span>
      ) : null}
    </button>
  );
});

const ChoiceItem = memo(function ChoiceItem({
  label,
  description,
  isActive,
  onClick,
}: {
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
        isActive
          ? "border-primary/45 bg-primary/10 shadow-sm"
          : "border-border/70 bg-background hover:bg-muted/45",
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isActive ? "Active" : "Select"}
      </span>
    </button>
  );
});
