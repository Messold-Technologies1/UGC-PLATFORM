"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatorCard } from "./creator-card";
import { CreatorFilters, DEFAULT_FILTERS, type Filters } from "./creator-filters";
import { MOCK_CREATORS } from "../data";
import type { Creator } from "../types";

function applyFilters(creators: Creator[], filters: Filters, search: string): Creator[] {
  return creators.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.city !== "All Cities" && c.location !== filters.city) return false;
    if (filters.category !== "All" && c.category !== filters.category) return false;
    if (filters.gender !== "all" && c.gender !== filters.gender) return false;
    if (filters.minPrice && c.startingPrice < Number(filters.minPrice)) return false;
    if (filters.maxPrice && c.startingPrice > Number(filters.maxPrice)) return false;
    if (filters.minRating && c.rating < Number(filters.minRating)) return false;
    if (filters.travelAvailable && !c.travelAvailable) return false;
    if (filters.storeVisit && !c.storeVisit) return false;
    return true;
  });
}

export function CreatorListing() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const results = useMemo(
    () => applyFilters(MOCK_CREATORS, filters, search),
    [filters, search]
  );

  const hasActiveFilters =
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const activeFilterCount = [
    filters.city !== DEFAULT_FILTERS.city,
    filters.category !== DEFAULT_FILTERS.category,
    filters.gender !== DEFAULT_FILTERS.gender,
    filters.minPrice !== DEFAULT_FILTERS.minPrice || filters.maxPrice !== DEFAULT_FILTERS.maxPrice,
    filters.minRating !== DEFAULT_FILTERS.minRating,
    filters.travelAvailable !== DEFAULT_FILTERS.travelAvailable,
    filters.storeVisit !== DEFAULT_FILTERS.storeVisit,
  ].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="gap-1.5 rounded-full px-4"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="size-3.5" />
            All filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search creators…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            {results.length} creator{results.length !== 1 && "s"}
          </p>
        </div>
      </div>

      <div className="flex">
        <div
          className={`shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            showFilters ? "w-72 opacity-100" : "w-0 opacity-0"
          }`}
        >
          <div className="w-72">
            <CreatorFilters
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              onClose={() => setShowFilters(false)}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {results.length > 0 ? (
            <div
              className={`grid gap-5 ${
                showFilters
                  ? "sm:grid-cols-2 xl:grid-cols-3"
                  : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              {results.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} variant="listing" />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="size-6 text-primary" />
              </div>
              <p className="text-sm font-medium">No creators match your filters</p>
              <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
                Try adjusting your search or filter criteria to find more creators.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setSearch("");
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
