"use client";

import { useState } from "react";
import { ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, CITIES } from "../data";

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

export function CreatorFilters({ filters, onChange, onReset, onClose }: CreatorFiltersProps) {
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
                onChange={(checked) => set("city", checked ? city : "All Cities")}
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

        <CollapsibleSection title="Price Range" defaultOpen>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => set("minPrice", e.target.value)}
              className="h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground shrink-0">to</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => set("maxPrice", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Rating">
          <div className="space-y-2">
            {[
              { value: "4.8", label: "4.8 & above" },
              { value: "4.5", label: "4.5 & above" },
              { value: "4", label: "4.0 & above" },
            ].map((r) => (
              <CheckboxItem
                key={r.value}
                label={r.label}
                checked={filters.minRating === r.value}
                onChange={(checked) => set("minRating", checked ? r.value : "")}
              />
            ))}
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

        <CollapsibleSection title="Store Visit">
          <div className="space-y-2">
            <CheckboxItem
              label="Available for store visits"
              checked={filters.storeVisit}
              onChange={(checked) => set("storeVisit", checked)}
            />
          </div>
        </CollapsibleSection>
      </div>

      {hasActiveFilters && (
        <div className="sticky bottom-0 border-t border-border bg-background px-5 py-3">
          <Button variant="outline" size="sm" onClick={onReset} className="w-full">
            Reset all filters
          </Button>
        </div>
      )}
    </aside>
  );
}

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
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") onChange(!checked); }}
        tabIndex={0}
        className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
          checked
            ? "border-primary bg-primary text-white"
            : "border-border bg-background group-hover:border-foreground/30"
        }`}
      >
        {checked && (
          <svg className="size-3" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
