"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreatorOrdersFiltersProps {
  activeTab: string;
  isCompact?: boolean;
}

export function CreatorOrdersFilters({
  activeTab,
  isCompact = false,
}: CreatorOrdersFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const showInlineFilters = activeTab === "all" || !isCompact;

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="relative flex-1 min-w-0 max-w-sm">
        <Input
          placeholder="Search by order ID or brand..."
          className="h-[42px] rounded-lg border-gray-200 pl-4 pr-11 text-[14px] shadow-sm bg-white placeholder:text-muted-foreground"
        />
        <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500" />
      </div>

      {showInlineFilters && (
        <div className="flex items-center gap-3 shrink-0">
          <Select>
            <SelectTrigger className="w-[130px] rounded-lg border-gray-200 bg-white h-[42px] shadow-sm text-[14px] font-medium text-gray-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[160px] rounded-lg border-gray-200 bg-white h-[42px] shadow-sm text-[14px] font-medium text-gray-700">
              <SelectValue placeholder="Delivery Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <button
        type="button"
        onClick={() => setFiltersOpen((prev) => !prev)}
        className={`flex shrink-0 items-center gap-2 h-[42px] rounded-lg border px-4 shadow-sm transition-colors ${
          filtersOpen
            ? "border-primary bg-primary/5 text-primary"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
        aria-label="Toggle filters"
        aria-expanded={filtersOpen}
      >
        <SlidersHorizontal className="size-[18px]" />
        <span className="text-[14px] font-medium">
          {showInlineFilters ? "More Filters" : "Filters"}
        </span>
      </button>
    </div>
  );
}
