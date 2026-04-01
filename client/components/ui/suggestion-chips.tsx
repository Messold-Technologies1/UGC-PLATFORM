"use client";

export type SuggestionChip = {
  key: string;
  label: string;
  ariaLabel?: string;
};

export function SuggestionChips({
  items,
  disabled = false,
  onSelect,
}: {
  items: SuggestionChip[];
  disabled?: boolean;
  onSelect: (label: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="inline-flex max-w-full items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-left text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={() => onSelect(item.label)}
          aria-label={item.ariaLabel}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
