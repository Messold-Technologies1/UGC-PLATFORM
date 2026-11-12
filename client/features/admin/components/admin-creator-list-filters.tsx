"use client";

import { useState } from "react";
import { ChevronDown, FilterX } from "lucide-react";
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
 * Same filter set as the public browse page, from the same option sources, so
 * an admin reproducing what a brand sees does not have to translate between
 * two vocabularies. It is a plain row of controls rather than a reuse of
 * `CreatorFilterBar`, which is a sticky, white, brand-styled bar carrying a
 * "Custom match" CTA and a disabled smart-search toggle — none of which
 * belong in the admin shell.
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
  dimension: "CONTENT_CATEGORY" | "CREATOR_TYPE" | "APPEARANCE" | "OCCUPATION" | "LANGUAGE";
  label: string;
}[] = [
  { key: "contentCategory", dimension: "CONTENT_CATEGORY", label: "Niche" },
  { key: "creatorType", dimension: "CREATOR_TYPE", label: "Creator type" },
  { key: "appearance", dimension: "APPEARANCE", label: "Appearance" },
  { key: "occupation", dimension: "OCCUPATION", label: "Occupation" },
  { key: "language", dimension: "LANGUAGE", label: "Language" },
];

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
          className="h-10 justify-between gap-2 rounded-xl border-border/60 bg-background/80 px-3 text-sm font-medium"
        >
          <span className="truncate">{label}</span>
          {count > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {count}
            </span>
          ) : (
            <ChevronDown className="size-4 opacity-60" aria-hidden />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-56 overflow-y-auto">
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
  label,
  options,
  value,
  onChange,
  className = "w-full sm:w-40",
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  className?: string;
}) {
  return (
    <Select
      value={value || ANY}
      onValueChange={(next) => onChange(next === ANY ? undefined : next)}
    >
      <SelectTrigger
        aria-label={label}
        className={`h-10 rounded-xl border-border/60 bg-background/80 ${className}`}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{label}</SelectItem>
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

  const followerValue =
    FOLLOWER_RANGE_OPTIONS.find(
      (option) =>
        Number(option.min) === filters.minFollowers &&
        (option.max === ""
          ? filters.maxFollowers === undefined
          : Number(option.max) === filters.maxFollowers),
    )?.value ?? undefined;

  // Restrictions are stored and filtered by their display name, which is
  // what `buildRestrictionRowMatch` matches on.
  const restrictionOptions = (restrictionSuggestions ?? []).map((item) => ({
    value: item.name,
    label: item.name,
  }));

  const activeCount =
    (filters.search?.trim() ? 1 : 0) +
    (
      [
        "city",
        "gender",
        "ageGroup",
        "minPrice",
        "maxPrice",
        "maxDeliveryDays",
        "minFollowers",
        "onLocationAvailable",
      ] as const
    ).filter((key) => filters[key] !== undefined && filters[key] !== "").length +
    (
      [
        "contentCategory",
        "creatorType",
        "appearance",
        "occupation",
        "language",
        "restrictions",
      ] as const
    ).filter((key) => (filters[key]?.length ?? 0) > 0).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminCreatorListSearch
          value={filters.search ?? ""}
          isLoading={isLoading}
          onChange={(search) => set("search", search)}
          className="relative w-full sm:max-w-sm"
        />

        <SingleFilter
          label="Any city"
          options={(options?.cities ?? []).map((city) => ({
            value: city,
            label: city,
          }))}
          value={filters.city}
          onChange={(value) => set("city", value)}
          className="w-full sm:w-44"
        />

        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 shrink-0 gap-1.5 text-muted-foreground"
            onClick={() => onChange({})}
          >
            <FilterX className="size-4" aria-hidden />
            Clear {activeCount}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FACET_FILTERS.map(({ key, dimension, label }) => (
          <MultiFilter
            key={key}
            label={label}
            options={(facets?.optionsByDimension?.[dimension] ?? []).map(
              (option) => ({ value: option.slug, label: option.label }),
            )}
            selected={filters[key] ?? []}
            onChange={(next) => set(key, next)}
          />
        ))}

        <MultiFilter
          label="Open to"
          options={restrictionOptions}
          selected={filters.restrictions ?? []}
          onChange={(next) => set("restrictions", next)}
        />

        <SingleFilter
          label="Any gender"
          options={GENDER_OPTIONS}
          value={filters.gender}
          onChange={(value) => set("gender", value)}
          className="w-36"
        />

        <SingleFilter
          label="Any age"
          options={AGE_GROUP_OPTIONS}
          value={filters.ageGroup}
          onChange={(value) => set("ageGroup", value)}
          className="w-32"
        />

        <SingleFilter
          label="Any followers"
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
          className="w-40"
        />

        <SingleFilter
          label="Any delivery"
          options={DELIVERY_WITHIN_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={filters.maxDeliveryDays?.toString()}
          onChange={(value) =>
            set("maxDeliveryDays", value ? Number(value) : undefined)
          }
          className="w-40"
        />

        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min ₹"
            aria-label="Minimum starting price"
            value={priceDraft.min}
            onChange={(event) => {
              setPriceDraft((draft) => ({ ...draft, min: event.target.value }));
              commitPrice("minPrice", event.target.value);
            }}
            className="h-10 w-24 rounded-xl border-border/60 bg-background/80"
          />
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max ₹"
            aria-label="Maximum starting price"
            value={priceDraft.max}
            onChange={(event) => {
              setPriceDraft((draft) => ({ ...draft, max: event.target.value }));
              commitPrice("maxPrice", event.target.value);
            }}
            className="h-10 w-24 rounded-xl border-border/60 bg-background/80"
          />
        </div>

        <div className="flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3">
          <Switch
            id="admin-filter-on-location"
            checked={Boolean(filters.onLocationAvailable)}
            onCheckedChange={(checked) =>
              set("onLocationAvailable", checked || undefined)
            }
          />
          <Label
            htmlFor="admin-filter-on-location"
            className="cursor-pointer whitespace-nowrap text-sm font-medium"
          >
            On location
          </Label>
        </div>
      </div>
    </div>
  );
}
