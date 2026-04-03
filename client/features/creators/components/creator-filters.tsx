"use client";

import { memo, useMemo, useRef, useEffect, useCallback, useState } from "react";
import { ChevronDown, Star, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "@/hooks/use-debounce";

export const CREATOR_PRICE_MIN = 0;
export const CREATOR_PRICE_MAX = 10_000;
const PRICE_STEP = 500;
const DEFAULT_OPEN_SECTIONS: string[] = [];

const GENDER_OPTIONS = [
  {
    value: "male",
    label: "Male",
    description: "Show creators who identify as male.",
  },
  {
    value: "female",
    label: "Female",
    description: "Show creators who identify as female.",
  },
  {
    value: "other",
    label: "Other",
    description: "Include creators outside the male and female labels.",
  },
] as const;

export interface Filters {
  city: string[];
  category: string[];
  gender: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  travelAvailable: boolean;
  storeVisit: boolean;
  industryLabel: string;
  tags: string;
}

export const DEFAULT_FILTERS: Filters = {
  city: [],
  category: [],
  gender: "all",
  minPrice: "",
  maxPrice: "",
  minRating: "",
  travelAvailable: false,
  storeVisit: false,
  industryLabel: "",
  tags: "",
};

interface CreatorFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClose: () => void;
  categoryOptions: string[];
  cityOptions: string[];
}

function normalizeSelectedValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function summarizeSelection(values: string[], emptyLabel: string) {
  if (values.length === 0) return emptyLabel;
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values[0]}, ${values[1]} +${values.length - 2}`;
}

export const CreatorFilters = memo(function CreatorFilters({
  filters,
  onChange,
  onClose,
  categoryOptions,
  cityOptions,
}: CreatorFiltersProps) {
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const [localIndustry, setLocalIndustry] = useState(filters.industryLabel ?? "");
  const [localTags, setLocalTags] = useState(filters.tags ?? "");
  const [locationSearch, setLocationSearch] = useState("");

  useEffect(() => {
    setLocalIndustry(filters.industryLabel ?? "");
  }, [filters.industryLabel]);

  useEffect(() => {
    setLocalTags(filters.tags ?? "");
  }, [filters.tags]);

  const handleChange = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      const nextFilters = { ...filtersRef.current, [key]: value };
      filtersRef.current = nextFilters;
      onChange(nextFilters);
    },
    [onChange],
  );

  const debouncedIndustry = useDebouncedCallback((val: string) => {
    handleChange("industryLabel", val);
  }, 800);

  const debouncedTags = useDebouncedCallback((val: string) => {
    handleChange("tags", val);
  }, 800);

  const toggleMultiSelect = useCallback(
    (key: "category" | "city", value: string) => {
      const currentValues = filtersRef.current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : normalizeSelectedValues([...currentValues, value]);
      handleChange(key, nextValues);
    },
    [handleChange],
  );

  const handleTravelChange = useCallback(
    (_id: string, checked: boolean) => handleChange("travelAvailable", checked),
    [handleChange],
  );

  const handleStoreVisitChange = useCallback(
    (checked: boolean) => handleChange("storeVisit", checked),
    [handleChange],
  );

  const handleRatingChange = useCallback(
    (value: string) => {
      handleChange(
        "minRating",
        filtersRef.current.minRating === value ? "" : value,
      );
    },
    [handleChange],
  );

  const handlePriceChange = useCallback(
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

  const sliderMin = filters.minPrice
    ? Number(filters.minPrice)
    : CREATOR_PRICE_MIN;
  const sliderMax = filters.maxPrice
    ? Number(filters.maxPrice)
    : CREATOR_PRICE_MAX;

  const categorySummary = useMemo(
    () => summarizeSelection(filters.category, "Any category"),
    [filters.category],
  );
  const locationSummary = useMemo(
    () => summarizeSelection(filters.city, "Any location"),
    [filters.city],
  );
  const filteredCityOptions = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();
    if (!query) return cityOptions;
    return cityOptions.filter((city) => city.toLowerCase().includes(query));
  }, [cityOptions, locationSearch]);
  const genderSummary = useMemo(() => {
    return (
      GENDER_OPTIONS.find((option) => option.value === filters.gender)?.label ??
      "Any gender"
    );
  }, [filters.gender]);

  const priceSummary = useMemo(() => {
    const hiLabel =
      sliderMax >= CREATOR_PRICE_MAX
        ? "₹10,000+"
        : `₹${sliderMax.toLocaleString("en-IN")}`;
    const loLabel = `₹${sliderMin.toLocaleString("en-IN")}`;
    return `${loLabel} - ${hiLabel}`;
  }, [sliderMax, sliderMin]);

  const priceFilterActive =
    filters.minPrice !== "" || filters.maxPrice !== "";

  const priceAction = useMemo(
    () => (
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          priceFilterActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {priceSummary}
      </span>
    ),
    [priceFilterActive, priceSummary],
  );

  return (
    <aside className="flex h-full min-h-72 w-full max-w-full flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/95 shadow-[0_18px_54px_-30px_rgba(15,23,42,0.45)] backdrop-blur lg:h-auto lg:min-h-80 lg:max-h-[calc(100svh-var(--creators-filter-top)-var(--creators-filter-gap)-5rem)]">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 bg-muted/20 px-5 py-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Filters
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Narrow results by audience fit, location, and creator profile.
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
              summary={
                filters.industryLabel || filters.tags
                  ? [filters.industryLabel, filters.tags]
                      .filter(Boolean)
                      .join(" • ")
                  : "Industry and tag based discovery"
              }
              selectedCount={
                Number(Boolean(filters.industryLabel)) +
                Number(Boolean(filters.tags))
              }
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Industry</p>
                  <Input
                    placeholder="e.g. Technology, Fashion..."
                    value={localIndustry}
                    onChange={(event) => {
                      setLocalIndustry(event.target.value);
                      debouncedIndustry(event.target.value);
                    }}
                    className="h-9 rounded-xl border-border/70 bg-background text-sm"
                  />
                </div>

                <Separator className="bg-border/70" />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Tags</p>
                  <Input
                    placeholder="e.g. UGC, Review, Unboxing..."
                    value={localTags}
                    onChange={(event) => {
                      setLocalTags(event.target.value);
                      debouncedTags(event.target.value);
                    }}
                    className="h-9 rounded-xl border-border/70 bg-background text-sm"
                  />
                </div>
              </div>
            </DropdownFilterSection>

            <Separator className="bg-border/70" />

            <DropdownFilterSection
              value="category"
              label="Category"
              summary={categorySummary}
              selectedCount={filters.category.length}
            >
              <SectionToolbar
                helperText="Choose one or more creator specialties."
                onClear={
                  filters.category.length > 0
                    ? () => handleChange("category", [])
                    : undefined
                }
              />
              {categoryOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No categories are available in the current results yet.
                </p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {categoryOptions.map((category) => (
                    <CheckboxItem
                      key={category}
                      label={category}
                      checked={filters.category.includes(category)}
                      onChange={() => toggleMultiSelect("category", category)}
                    />
                  ))}
                </div>
              )}
            </DropdownFilterSection>

            <DropdownFilterSection
              value="location"
              label="Location"
              summary={locationSummary}
              selectedCount={filters.city.length}
            >
              <SectionToolbar
                helperText="Select multiple cities to widen the shortlist."
                onClear={
                  filters.city.length > 0
                    ? () => handleChange("city", [])
                    : undefined
                }
              />
              <Input
                placeholder="Search location..."
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                className="mb-3 h-8 rounded-xl border-border/70 bg-background text-xs"
              />
              {cityOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No locations are available in the current results yet.
                </p>
              ) : filteredCityOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No locations match your search.
                </p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {filteredCityOptions.map((city) => (
                    <CheckboxItem
                      key={city}
                      label={city}
                      checked={filters.city.includes(city)}
                      onChange={() => toggleMultiSelect("city", city)}
                    />
                  ))}
                </div>
              )}
            </DropdownFilterSection>

            <DropdownFilterSection
              value="gender"
              label="Gender"
              summary={genderSummary}
              selectedCount={filters.gender === "all" ? 0 : 1}
            >
              <SectionToolbar helperText="Keep it open or target a specific audience." />
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
                        filters.gender === option.value ? "all" : option.value,
                      )
                    }
                  />
                ))}
              </div>
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
                  value={[sliderMin, sliderMax]}
                  onValueChange={handlePriceChange}
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

          <FilterSection label="Rating">
            <div className="space-y-2">
              {[
                { value: "4.8", label: "4.8 & above", stars: 5 },
                { value: "4.5", label: "4.5 & above", stars: 4.5 },
                { value: "4", label: "4.0 & above", stars: 4 },
                { value: "3", label: "3.0 & above", stars: 3 },
              ].map((rating) => (
                <RatingButton
                  key={rating.value}
                  value={rating.value}
                  label={rating.label}
                  stars={rating.stars}
                  isActive={filters.minRating === rating.value}
                  onClick={handleRatingChange}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection label="Travel availability">
            <div className="space-y-2">
              <CheckboxItem
                label="Can travel to shoot"
                checked={filters.travelAvailable}
                onChange={() =>
                  handleTravelChange("travelAvailable", !filters.travelAvailable)
                }
              />
            </div>
          </FilterSection>

          <FilterSection label="Store visit">
            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/35 px-3.5 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-none text-foreground">
                  {filters.storeVisit ? "Yes" : "No"}
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground">
                  Available for store visits
                </p>
              </div>
              <Switch
                checked={filters.storeVisit}
                onCheckedChange={handleStoreVisitChange}
              />
            </div>
          </FilterSection>
        </div>
      </div>
    </aside>
  );
});

const StarRating = memo(function StarRating({ count }: { count: number }) {
  const full = Math.floor(count);
  const hasHalf = count % 1 !== 0;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: full }, (_, index) => (
        <Star
          key={`full-${index}`}
          className="size-3.5 fill-amber-400 text-amber-400"
        />
      ))}
      {hasHalf && (
        <span className="relative">
          <Star className="size-3.5 text-amber-400/30" />
          <span
            className="absolute inset-0 overflow-hidden"
            style={{ width: "50%" }}
          >
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
          </span>
        </span>
      )}
      {Array.from({ length: empty }, (_, index) => (
        <Star key={`empty-${index}`} className="size-3.5 text-amber-400/30" />
      ))}
    </span>
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
              <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
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

const RatingButton = memo(function RatingButton({
  value,
  label,
  stars,
  isActive,
  onClick,
}: {
  value: string;
  label: string;
  stars: number;
  isActive: boolean;
  onClick: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors",
        isActive
          ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
          : "border-border/70 bg-background hover:bg-muted/50",
      )}
    >
      <StarRating count={stars} />
      <span className={isActive ? "font-medium" : "text-foreground"}>{label}</span>
    </button>
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
