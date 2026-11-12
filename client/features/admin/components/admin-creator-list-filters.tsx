"use client";

import { useState } from "react";
import { ChevronDown, FilterX, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AdminCreatorListSearch } from "@/features/admin/components/admin-creator-list-search";
import { useAdminCreatorFilterOptionsQuery } from "@/features/admin/hooks/use-admin-creator-filter-options-query";
import type { AdminCreatorListFilters } from "@/features/admin/types";
import {
  useCreatorFacetOptionsQuery,
  useCreatorRestrictionSuggestionsQuery,
} from "@/features/creators/hooks/use-creator-suggestion-queries";
import {
  AGE_GROUP_OPTIONS,
  DELIVERY_WITHIN_OPTIONS,
  FOLLOWER_RANGE_OPTIONS,
  GENDER_OPTIONS,
} from "@/features/creators/types/creator-filter-types";
import { useDebouncedCallback } from "@/hooks/use-debounce";

/**
 * Search and filters for the admin creator list.
 *
 * Sits ABOVE the tabs, not inside them, because it is not scoped to one: the
 * same search and filters drive every tab's count, so a creator can be found
 * without knowing which stage they are in.
 *
 * Everything except the search lives behind one "Filters" button. It is the
 * browse page's whole set — thirteen controls — and strung across the bar
 * they crowded out the thing an admin reaches for most, which is the search.
 *
 * Not a reuse of `CreatorFilterBar`: that is a sticky, white, brand-styled
 * bar carrying a "Custom match" CTA and a disabled smart-search toggle. The
 * option lists are shared with it, so both offer identical choices.
 *
 * `SelectItem` cannot take an empty string as a value, so "any" travels as a
 * sentinel and is translated at the boundary.
 */
const ANY = "__any__";

type FacetKey =
  | "contentCategory"
  | "creatorType"
  | "appearance"
  | "occupation"
  | "language";

const FACET_FILTERS: {
  key: FacetKey;
  dimension:
    | "CONTENT_CATEGORY"
    | "CREATOR_TYPE"
    | "APPEARANCE"
    | "OCCUPATION"
    | "LANGUAGE";
  label: string;
}[] = [
  { key: "contentCategory", dimension: "CONTENT_CATEGORY", label: "Niche" },
  { key: "creatorType", dimension: "CREATOR_TYPE", label: "Creator type" },
  { key: "appearance", dimension: "APPEARANCE", label: "Appearance" },
  { key: "occupation", dimension: "OCCUPATION", label: "Occupation" },
  { key: "language", dimension: "LANGUAGE", label: "Language" },
];

/** Keys that hold a single scalar, for counting what is active. */
const SCALAR_KEYS = [
  "city",
  "gender",
  "ageGroup",
  "minPrice",
  "maxPrice",
  "maxDeliveryDays",
  "minFollowers",
  "onLocationAvailable",
] as const;

/** Keys that hold a list of slugs. */
const LIST_KEYS = [
  "contentCategory",
  "creatorType",
  "appearance",
  "occupation",
  "language",
  "restrictions",
] as const;

/** One labelled row inside the panel. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

/** A dropdown of checkboxes for one multi-valued filter. */
function MultiFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const count = selected.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-between gap-2 rounded-lg border-border/60 bg-background/80 px-3 text-sm font-normal"
        >
          <span className="truncate text-muted-foreground">
            {count > 0 ? `${count} selected` : "Any"}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-72 w-56 overflow-y-auto"
      >
        {options.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            Nothing to choose from yet.
          </div>
        ) : null}
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            // Keeps the menu open so several can be ticked in one go.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...selected, option.value]
                  : selected.filter((value) => value !== option.value),
              )
            }
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A single-choice dropdown with an explicit "any" entry. */
function SingleFilter({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string;
  options: readonly { value: string; label: string }[];
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  return (
    <Select
      value={value || ANY}
      onValueChange={(next) => onChange(next === ANY ? undefined : next)}
    >
      <SelectTrigger
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border-border/60 bg-background/80"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AdminCreatorListFiltersBar({
  filters,
  isLoading = false,
  onChange,
}: {
  filters: AdminCreatorListFilters;
  isLoading?: boolean;
  onChange: (next: AdminCreatorListFilters) => void;
}) {
  const { data: options } = useAdminCreatorFilterOptionsQuery();
  const { data: facets } = useCreatorFacetOptionsQuery();
  const { data: restrictionSuggestions } =
    useCreatorRestrictionSuggestionsQuery();

  const set = <K extends keyof AdminCreatorListFilters>(
    key: K,
    value: AdminCreatorListFilters[K],
  ) => {
    const next = { ...filters, [key]: value };
    // Empty arrays and blanks are "no filter", not "match nothing".
    if (
      value === undefined ||
      value === "" ||
      value === false ||
      (Array.isArray(value) && value.length === 0)
    ) {
      delete next[key];
    }
    onChange(next);
  };

  // Price is typed, so it is committed on a pause rather than per keystroke,
  // which means the field holds a draft the props have not caught up with yet.
  const [priceDraft, setPriceDraft] = useState({
    min: filters.minPrice?.toString() ?? "",
    max: filters.maxPrice?.toString() ?? "",
  });
  // Re-synced during render rather than in an effect: an effect would render
  // once with the stale draft and then again to correct it. Same pattern as
  // the `?creatorId=` sync in creator-listing.tsx.
  const priceKey = `${filters.minPrice ?? ""}|${filters.maxPrice ?? ""}`;
  const [syncedPriceKey, setSyncedPriceKey] = useState(priceKey);
  if (priceKey !== syncedPriceKey) {
    setSyncedPriceKey(priceKey);
    setPriceDraft({
      min: filters.minPrice?.toString() ?? "",
      max: filters.maxPrice?.toString() ?? "",
    });
  }

  const commitPrice = useDebouncedCallback(
    (key: "minPrice" | "maxPrice", raw: string) => {
      const parsed = Number.parseInt(raw, 10);
      set(key, Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined);
    },
    400,
  );

  const followerValue = FOLLOWER_RANGE_OPTIONS.find(
    (option) =>
      Number(option.min) === filters.minFollowers &&
      (option.max === ""
        ? filters.maxFollowers === undefined
        : Number(option.max) === filters.maxFollowers),
  )?.value;

  const restrictionOptions = (restrictionSuggestions ?? []).map((item) => ({
    value: item.name,
    label: item.name,
  }));

  // Counted on the button so a collapsed panel still says it is doing
  // something — otherwise a filtered list looks unfiltered.
  const activeFilterCount =
    SCALAR_KEYS.filter(
      (key) => filters[key] !== undefined && filters[key] !== "",
    ).length + LIST_KEYS.filter((key) => (filters[key]?.length ?? 0) > 0).length;

  const hasSearch = Boolean(filters.search?.trim());

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <AdminCreatorListSearch
        value={filters.search ?? ""}
        isLoading={isLoading}
        onChange={(search) => set("search", search)}
        className="relative w-full sm:max-w-sm"
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 gap-2 rounded-xl border-border/60 bg-background/80 px-3.5 font-medium"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {activeFilterCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[min(32rem,calc(100vw-2rem))]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City">
              <SingleFilter
                placeholder="Any city"
                options={(options?.cities ?? []).map((city) => ({
                  value: city,
                  label: city,
                }))}
                value={filters.city}
                onChange={(value) => set("city", value)}
              />
            </Field>

            {FACET_FILTERS.map(({ key, dimension, label }) => (
              <Field key={key} label={label}>
                <MultiFilter
                  label={label}
                  options={(facets?.optionsByDimension?.[dimension] ?? []).map(
                    (option) => ({ value: option.slug, label: option.label }),
                  )}
                  selected={filters[key] ?? []}
                  onChange={(next) => set(key, next)}
                />
              </Field>
            ))}

            <Field label="Open to">
              <MultiFilter
                label="Open to"
                options={restrictionOptions}
                selected={filters.restrictions ?? []}
                onChange={(next) => set("restrictions", next)}
              />
            </Field>

            <Field label="Gender">
              <SingleFilter
                placeholder="Any gender"
                options={GENDER_OPTIONS}
                value={filters.gender}
                onChange={(value) => set("gender", value)}
              />
            </Field>

            <Field label="Age">
              <SingleFilter
                placeholder="Any age"
                options={AGE_GROUP_OPTIONS}
                value={filters.ageGroup}
                onChange={(value) => set("ageGroup", value)}
              />
            </Field>

            <Field label="Followers">
              <SingleFilter
                placeholder="Any followers"
                options={FOLLOWER_RANGE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={followerValue}
                onChange={(value) => {
                  const option = FOLLOWER_RANGE_OPTIONS.find(
                    (entry) => entry.value === value,
                  );
                  onChange({
                    ...filters,
                    minFollowers: option ? Number(option.min) : undefined,
                    maxFollowers:
                      option && option.max ? Number(option.max) : undefined,
                  });
                }}
              />
            </Field>

            <Field label="Delivery">
              <SingleFilter
                placeholder="Any delivery"
                options={DELIVERY_WITHIN_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={filters.maxDeliveryDays?.toString()}
                onChange={(value) =>
                  set("maxDeliveryDays", value ? Number(value) : undefined)
                }
              />
            </Field>

            <Field label="Starting price">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Min ₹"
                  aria-label="Minimum starting price"
                  value={priceDraft.min}
                  onChange={(event) => {
                    setPriceDraft((draft) => ({
                      ...draft,
                      min: event.target.value,
                    }));
                    commitPrice("minPrice", event.target.value);
                  }}
                  className="h-9 rounded-lg border-border/60 bg-background/80"
                />
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Max ₹"
                  aria-label="Maximum starting price"
                  value={priceDraft.max}
                  onChange={(event) => {
                    setPriceDraft((draft) => ({
                      ...draft,
                      max: event.target.value,
                    }));
                    commitPrice("maxPrice", event.target.value);
                  }}
                  className="h-9 rounded-lg border-border/60 bg-background/80"
                />
              </div>
            </Field>

            <Field label="Travel">
              <div className="flex h-9 items-center gap-2">
                <Switch
                  id="admin-filter-on-location"
                  checked={Boolean(filters.onLocationAvailable)}
                  onCheckedChange={(checked) =>
                    set("onLocationAvailable", checked || undefined)
                  }
                />
                <Label
                  htmlFor="admin-filter-on-location"
                  className="cursor-pointer whitespace-nowrap text-sm font-normal"
                >
                  Available on location
                </Label>
              </div>
            </Field>
          </div>

          {activeFilterCount > 0 ? (
            <div className="mt-4 flex justify-end border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                // Clears the filters only; the search sits outside this panel
                // and has its own clear button.
                onClick={() =>
                  onChange(filters.search ? { search: filters.search } : {})
                }
              >
                <FilterX className="size-4" aria-hidden />
                Clear filters
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      {hasSearch || activeFilterCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 shrink-0 gap-1.5 text-muted-foreground"
          onClick={() => onChange({})}
        >
          <FilterX className="size-4" aria-hidden />
          Clear all
        </Button>
      ) : null}
    </div>
  );
}
