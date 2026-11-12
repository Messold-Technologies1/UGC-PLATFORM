"use client";

import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminCreatorListSearch } from "@/features/admin/components/admin-creator-list-search";
import { useAdminCreatorFilterOptionsQuery } from "@/features/admin/hooks/use-admin-creator-filter-options-query";
import type { AdminCreatorListFilters } from "@/features/admin/types";

/**
 * Search and filters for the admin creator list.
 *
 * Sits ABOVE the tabs, not inside them, because it is not scoped to one: the
 * same search and filters drive every tab's count, so a creator can be found
 * without knowing which stage they are in.
 *
 * `SelectItem` cannot take an empty string as a value, so "any" is carried as
 * a sentinel and translated at the boundary.
 */
const ANY = "__any__";

export function AdminCreatorListFiltersBar({
  filters,
  isLoading = false,
  onChange,
}: {
  filters: AdminCreatorListFilters;
  isLoading?: boolean;
  onChange: (next: AdminCreatorListFilters) => void;
}) {
  const { data: options, isLoading: optionsLoading } =
    useAdminCreatorFilterOptionsQuery();

  const niches = options?.niches ?? [];
  const cities = options?.cities ?? [];
  const hasFilters = Boolean(
    filters.search?.trim() || filters.niche || filters.city,
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <AdminCreatorListSearch
        value={filters.search ?? ""}
        isLoading={isLoading}
        onChange={(search) => onChange({ ...filters, search })}
        className="relative w-full sm:max-w-sm"
      />

      <Select
        value={filters.niche || ANY}
        onValueChange={(value) =>
          onChange({ ...filters, niche: value === ANY ? undefined : value })
        }
      >
        <SelectTrigger
          aria-label="Filter by niche"
          className="h-10 w-full rounded-xl border-border/60 bg-background/80 sm:w-44"
        >
          <SelectValue placeholder="Any niche" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any niche</SelectItem>
          {niches.map((niche) => (
            <SelectItem key={niche.slug} value={niche.slug}>
              {niche.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.city || ANY}
        onValueChange={(value) =>
          onChange({ ...filters, city: value === ANY ? undefined : value })
        }
      >
        <SelectTrigger
          aria-label="Filter by city"
          className="h-10 w-full rounded-xl border-border/60 bg-background/80 sm:w-44"
        >
          <SelectValue placeholder="Any city" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any city</SelectItem>
          {cities.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 shrink-0 gap-1.5 text-muted-foreground"
          onClick={() => onChange({})}
        >
          <FilterX className="size-4" aria-hidden />
          Clear
        </Button>
      ) : null}

      {optionsLoading ? (
        <span className="sr-only" role="status">
          Loading filter options
        </span>
      ) : null}
    </div>
  );
}
