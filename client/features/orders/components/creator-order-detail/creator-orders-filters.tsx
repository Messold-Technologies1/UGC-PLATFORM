"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";


interface CreatorOrdersFiltersProps {
  activeTab: string;
  isCompact?: boolean;
}

export function CreatorOrdersFilters({
  activeTab,
  isCompact = false,
}: CreatorOrdersFiltersProps) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="relative flex-1 min-w-0 max-w-sm">
        <Input
          placeholder="Search by order ID or brand..."
          className="h-[42px] rounded-lg border-gray-200 pl-4 pr-11 text-[14px] shadow-sm bg-white placeholder:text-muted-foreground"
        />
        <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500" />
      </div>
    </div>
  );
}
