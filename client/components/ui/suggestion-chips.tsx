"use client";

import { cn } from "@/lib/utils";

export type SuggestionChip = {
  key: string;
  label: string;
  ariaLabel?: string;
};

export function SuggestionChips({
  items,
  disabled = false,
  selectedLabels = [],
  onSelect,
}: {
  items: SuggestionChip[];
  disabled?: boolean;
  selectedLabels?: string[];
  onSelect: (label: string, nextSelected: boolean) => void;
}) {
  if (items.length === 0) return null;

  const selectedSet = new Set(selectedLabels.map((label) => label.toLowerCase()));

  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {items.map((item) => {
        const isSelected = selectedSet.has(item.label.toLowerCase());

        return (
          <button
            key={item.key}
            type="button"
            className={cn(
               "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              isSelected
                ? "border-primary bg-primary text-white hover:bg-primary/90 dark:text-black"
                : "border-border bg-muted/40 text-foreground hover:border-primary/20 hover:bg-accent/70 hover:text-accent-foreground",
            )}
            disabled={disabled}
            onClick={() => onSelect(item.label, !isSelected)}
            aria-label={item.ariaLabel}
            aria-pressed={isSelected}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
