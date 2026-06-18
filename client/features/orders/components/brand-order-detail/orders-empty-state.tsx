"use client";

import { Search } from "lucide-react";

interface OrdersEmptyStateProps {
  hasFilter: boolean;
}

export function OrdersEmptyState({ hasFilter }: OrdersEmptyStateProps) {
  return (
    <div
      id="orders-empty-state"
      className="flex flex-col items-center justify-center rounded-[20px] border-[1.5px] border-dashed border-border bg-muted/50 px-6 py-[70px] text-center"
    >
      <div className="mb-3.5 grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Search className="size-[26px]" strokeWidth={1.8} />
      </div>
      <h3 className="font-heading text-lg font-extrabold tracking-tight">
        {hasFilter ? "Nothing here yet" : "No orders yet"}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        {hasFilter
          ? "No collaborations match this filter. Try another tab."
          : "When you place orders with creators, they\u2019ll appear here so you can follow progress and manage delivery."}
      </p>
    </div>
  );
}
