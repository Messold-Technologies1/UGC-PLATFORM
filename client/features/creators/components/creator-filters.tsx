"use client";

import { memo, useMemo, useRef, useEffect, useCallback } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const CREATOR_PRICE_MIN = 0;
export const CREATOR_PRICE_MAX = 10_000;
const PRICE_STEP = 500;

export interface Filters {
  city: string;
  category: string;
  gender: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  travelAvailable: boolean;
  storeVisit: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  city: "All Cities",
  category: "All",
  gender: "all",
  minPrice: "",
  maxPrice: "",
  minRating: "",
  travelAvailable: false,
  storeVisit: false,
};

interface CreatorFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClose: () => void;
  categoryOptions: string[];
  cityOptions: string[];
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

  const handleChange = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      onChange({ ...filtersRef.current, [key]: value });
    },
    [onChange],
  );

  const handleCategoryChange = useCallback(
    (cat: string, checked: boolean) =>
      handleChange("category", checked ? cat : "All"),
    [handleChange],
  );

  const handleCityChange = useCallback(
    (city: string, checked: boolean) =>
      handleChange("city", checked ? city : "All Cities"),
    [handleChange],
  );

  const handleGenderChange = useCallback(
    (gender: string, checked: boolean) =>
      handleChange("gender", checked ? gender : "all"),
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
      handleChange("minPrice", min <= CREATOR_PRICE_MIN ? "" : String(min));
      handleChange("maxPrice", max >= CREATOR_PRICE_MAX ? "" : String(max));
    },
    [handleChange],
  );

  const sliderMin = filters.minPrice
    ? Number(filters.minPrice)
    : CREATOR_PRICE_MIN;
  const sliderMax = filters.maxPrice
    ? Number(filters.maxPrice)
    : CREATOR_PRICE_MAX;

  const priceSummary = useMemo(() => {
    const lo = sliderMin;
    const hiLabel =
      sliderMax >= CREATOR_PRICE_MAX
        ? "₹10,000+"
        : `₹${sliderMax.toLocaleString("en-IN")}`;
    const loLabel = `₹${lo.toLocaleString("en-IN")}`;
    return `${loLabel} – ${hiLabel}`;
  }, [sliderMin, sliderMax]);

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
    [priceSummary, priceFilterActive],
  );

  return (
    <aside className="flex h-full min-h-72 w-full max-w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:h-auto lg:min-h-80 lg:max-h-[calc(100svh-var(--creators-filter-top)-var(--creators-filter-gap)-5rem)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          Filters
        </h3>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close filters"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-2">
        <FilterSection label="Category">
          <div className="space-y-2">
            {categoryOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No categories in the loaded creators yet.
              </p>
            ) : (
              categoryOptions.map((cat) => (
                <CheckboxItem
                  key={cat}
                  id={cat}
                  label={cat}
                  checked={filters.category === cat}
                  onChange={handleCategoryChange}
                />
              ))
            )}
          </div>
        </FilterSection>

        <FilterSection label="Location">
          <div className="space-y-2">
            {cityOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No locations in the loaded creators yet.
              </p>
            ) : (
              cityOptions.map((city) => (
                <CheckboxItem
                  key={city}
                  id={city}
                  label={city}
                  checked={filters.city === city}
                  onChange={handleCityChange}
                />
              ))
            )}
          </div>
        </FilterSection>

        <FilterSection label="Gender">
          <div className="space-y-2">
            {(["male", "female", "other"] as const).map((g) => (
              <CheckboxItem
                key={g}
                id={g}
                label={g.charAt(0).toUpperCase() + g.slice(1)}
                checked={filters.gender === g}
                onChange={handleGenderChange}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection label="Price range" action={priceAction}>
          <div className="space-y-4 pt-1">
            <Slider
              min={CREATOR_PRICE_MIN}
              max={CREATOR_PRICE_MAX}
              step={PRICE_STEP}
              value={[sliderMin, sliderMax]}
              onValueChange={handlePriceChange}
              trackClassName="h-2"
              rangeClassName="bg-primary"
              thumbClassName="size-4 border-primary bg-background"
            />
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
            ].map((r) => (
              <RatingButton
                key={r.value}
                value={r.value}
                label={r.label}
                stars={r.stars}
                isActive={filters.minRating === r.value}
                onClick={handleRatingChange}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection label="Travel availability">
          <div className="space-y-2">
            <CheckboxItem
              id="travelCheck"
              label="Can travel to shoot"
              checked={filters.travelAvailable}
              onChange={handleTravelChange}
            />
          </div>
        </FilterSection>

        <FilterSection label="Store visit">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-medium leading-none">
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
    </aside>
  );
});

const StarRating = memo(function StarRating({ count }: { count: number }) {
  const full = Math.floor(count);
  const hasHalf = count % 1 !== 0;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: full }, (_, i) => (
        <Star
          key={`f-${i}`}
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
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e-${i}`} className="size-3.5 text-amber-400/30" />
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
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {action}
      </div>
      {children}
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
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
          : "hover:bg-muted",
      )}
    >
      <StarRating count={stars} />
      <span className={isActive ? "font-medium" : ""}>{label}</span>
    </button>
  );
});

const CheckboxItem = memo(function CheckboxItem({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (id: string, checked: boolean) => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3">
      <div
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(id, !checked)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") onChange(id, !checked);
        }}
        tabIndex={0}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 bg-background group-hover:border-muted-foreground/60",
        )}
      >
        {checked && (
          <svg className="size-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
});
