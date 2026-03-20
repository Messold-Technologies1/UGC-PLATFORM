"use client";

import { useState } from "react";
import { ChevronUp, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES, CITIES } from "../data";

const PRICE_MIN = 0;
const PRICE_MAX = 10000;
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
  onReset: () => void;
  onClose: () => void;
}

export function CreatorFilters({
  filters,
  onChange,
  onReset,
  onClose,
}: CreatorFiltersProps) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters =
    filters.city !== DEFAULT_FILTERS.city ||
    filters.category !== DEFAULT_FILTERS.category ||
    filters.gender !== DEFAULT_FILTERS.gender ||
    filters.minPrice !== DEFAULT_FILTERS.minPrice ||
    filters.maxPrice !== DEFAULT_FILTERS.maxPrice ||
    filters.minRating !== DEFAULT_FILTERS.minRating ||
    filters.travelAvailable !== DEFAULT_FILTERS.travelAvailable ||
    filters.storeVisit !== DEFAULT_FILTERS.storeVisit;

  const sliderMin = filters.minPrice ? Number(filters.minPrice) : PRICE_MIN;
  const sliderMax = filters.maxPrice ? Number(filters.maxPrice) : PRICE_MAX;

  return (
    <aside className="h-full overflow-y-auto border-r border-border bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
        <h3 className="text-base font-medium">Filters</h3>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="px-5 py-4 space-y-1">
        <CollapsibleSection title="Category" defaultOpen>
          <div className="space-y-2">
            {CATEGORIES.filter((c) => c !== "All").map((cat) => (
              <CheckboxItem
                key={cat}
                label={cat}
                checked={filters.category === cat}
                onChange={(checked) => set("category", checked ? cat : "All")}
              />
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Location" defaultOpen>
          <div className="space-y-2">
            {CITIES.filter((c) => c !== "All Cities").map((city) => (
              <CheckboxItem
                key={city}
                label={city}
                checked={filters.city === city}
                onChange={(checked) =>
                  set("city", checked ? city : "All Cities")
                }
              />
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Gender" defaultOpen>
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
        </CollapsibleSection>

        {/* ── Price Range Slider ── */}
        <CollapsibleSection title="Price Range" defaultOpen>
          <div className="space-y-4">
            <Slider
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={[sliderMin, sliderMax]}
              onValueChange={([min, max]) => {
                onChange({
                  ...filters,
                  minPrice: min === PRICE_MIN ? "" : String(min),
                  maxPrice: max === PRICE_MAX ? "" : String(max),
                });
              }}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                ₹{sliderMin.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px]">to</span>
              <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                ₹{sliderMax.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Rating Star Filter ── */}
        <CollapsibleSection title="Rating">
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
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "hover:bg-muted"
                  }`}
                >
                  <StarRating count={r.stars} />
                  <span className={isActive ? "font-medium" : ""}>
                    {r.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Travel Availability">
          <div className="space-y-2">
            <CheckboxItem
              label="Can travel to shoot"
              checked={filters.travelAvailable}
              onChange={(checked) => set("travelAvailable", checked)}
            />
          </div>
        </CollapsibleSection>

        {/* ── Store Visit Toggle ── */}
        <CollapsibleSection title="Store Visit">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-medium leading-none">
                {filters.storeVisit ? "Yes" : "No"}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Available for store visits
              </p>
            </div>
            <Switch
              checked={filters.storeVisit}
              onCheckedChange={(checked) => set("storeVisit", checked)}
            />
          </div>
        </CollapsibleSection>
      </div>

      {hasActiveFilters && (
        <div className="sticky bottom-0 border-t border-border bg-background px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="w-full"
          >
            Reset all filters
          </Button>
        </div>
      )}
    </aside>
  );
}

/* ── Star Rating Display ── */
function StarRating({ count }: { count: number }) {
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
          <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
          </span>
        </span>
      )}
      {Array.from({ length: empty }, (_, i) => (
        <Star
          key={`e-${i}`}
          className="size-3.5 text-amber-400/30"
        />
      ))}
    </span>
  );
}

/* ── Collapsible Section ── */
function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/60 py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-1 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
      >
        {title}
        <ChevronUp
          className={`size-4 text-muted-foreground transition-transform duration-200 ${
            open ? "" : "rotate-180"
          }`}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/* ── Checkbox Item ── */
function CheckboxItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 group">
      <div
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") onChange(!checked);
        }}
        tabIndex={0}
        className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
          checked
            ? "border-primary bg-primary text-white"
            : "border-border bg-background group-hover:border-foreground/30"
        }`}
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
}
