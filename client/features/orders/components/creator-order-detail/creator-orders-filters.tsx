"use client";

import { Search } from "lucide-react";
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
}

export function CreatorOrdersFilters({ activeTab }: CreatorOrdersFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-3 w-full">
      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by order ID or brand name..."
          className="pl-9 rounded-lg border-border/50 bg-background h-10 shadow-sm"
        />
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto">
        <Select>
          <SelectTrigger className="w-full md:w-[130px] rounded-lg border-border/50 bg-background h-10 shadow-sm font-medium">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-full md:w-[150px] rounded-lg border-border/50 bg-background h-10 shadow-sm font-medium">
            <SelectValue placeholder="Delivery Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
