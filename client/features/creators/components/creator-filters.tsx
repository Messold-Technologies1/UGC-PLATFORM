"use client";

import { memo, useMemo } from "react";
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
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

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

  return (
    <aside className="flex h-full min-h-72 w-full max-w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:min-h-80 lg:max-h-[calc(100svh-9.5rem)]">
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
                  label={cat}
                  checked={filters.category === cat}
                  onChange={(checked) => set("category", checked ? cat : "All")}
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
                  label={city}
                  checked={filters.city === city}
                  onChange={(checked) =>
                    set("city", checked ? city : "All Cities")
                  }
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
                label={g.charAt(0).toUpperCase() + g.slice(1)}
                checked={filters.gender === g}
                onChange={(checked) => set("gender", checked ? g : "all")}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection
          label="Price range"
          action={
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                priceFilterActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {priceSummary}
            </span>
          }
        >
          <div className="space-y-4 pt-1">
            <Slider
              min={CREATOR_PRICE_MIN}
              max={CREATOR_PRICE_MAX}
              step={PRICE_STEP}
              value={[sliderMin, sliderMax]}
              onValueChange={([min, max]) => {
                onChange({
                  ...filters,
                  minPrice: min <= CREATOR_PRICE_MIN ? "" : String(min),
                  maxPrice: max >= CREATOR_PRICE_MAX ? "" : String(max),
                });
              }}
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
            ].map((r) => {
              const isActive = filters.minRating === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set("minRating", isActive ? "" : r.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                      : "hover:bg-muted",
                  )}
                >
                  <StarRating count={r.stars} />
                  <span className={isActive ? "font-medium" : ""}>
                    {r.label}
                  </span>
                </button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection label="Travel availability">
          <div className="space-y-2">
            <CheckboxItem
              label="Can travel to shoot"
              checked={filters.travelAvailable}
              onChange={(checked) => set("travelAvailable", checked)}
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
              onCheckedChange={(checked) => set("storeVisit", checked)}
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

const CheckboxItem = memo(function CheckboxItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3">
      <div
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") onChange(!checked);
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
