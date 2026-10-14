"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type LanguageMultiSelectOption = { slug: string; label: string };

/**
 * A single box where a creator picks multiple languages. Selected languages
 * show as removable chips inside the control; the dropdown offers a searchable,
 * checkable list. No fluency — just membership.
 */
export function LanguageMultiSelect({
  options,
  selected,
  disabled = false,
  onToggle,
  placeholder = "Select the languages you can create in",
}: {
  options: LanguageMultiSelectOption[];
  selected: string[];
  disabled?: boolean;
  onToggle: (slug: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const labelBySlug = useMemo(
    () => new Map(options.map((o) => [o.slug, o.label])),
    [options],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <div className="relative w-full">
      <button
        type="button"
        className={cn(
          "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[10px] border-[1.4px] border-border bg-card px-3 py-1.5 text-left transition-[border-color,box-shadow] duration-150",
          open &&
            "border-[color-mix(in_oklab,var(--primary)_55%,var(--border))] shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_12%,transparent)]",
          disabled && "cursor-not-allowed opacity-60",
        )}
        data-open={open}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selected.length === 0 ? (
            <span className="text-[13.5px] text-muted-foreground">
              {placeholder}
            </span>
          ) : (
            selected.map((slug) => (
              <span
                key={slug}
                className="inline-flex h-[26px] items-center gap-[5px] rounded-full border border-[color-mix(in_oklab,var(--primary)_25%,transparent)] bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))] py-0 pr-1.5 pl-2.5 text-[12.5px] font-semibold text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) onToggle(slug);
                }}
              >
                {labelBySlug.get(slug) ?? slug}
                <span
                  className="grid size-4 place-items-center rounded-full bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] hover:bg-primary hover:text-white"
                  aria-hidden
                >
                  <X size={12} />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          size={16}
          className="shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>

      {open && !disabled ? (
        <>
          <div className="fixed inset-0 z-[45]" onClick={() => setOpen(false)} />
          <div
            className="absolute top-[calc(100%+6px)] right-0 left-0 z-[46] overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_40px_-18px_rgb(24_19_19/0.4)]"
            role="listbox"
            aria-multiselectable="true"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 text-muted-foreground">
              <Search size={14} aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search languages"
                autoFocus
                className="flex-1 border-0 bg-transparent font-[inherit] text-[13.5px] text-foreground outline-none"
              />
            </div>
            <div className="flex max-h-[260px] flex-col gap-0.5 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-[13px] text-muted-foreground">
                  No matches
                </div>
              ) : (
                filtered.map((o) => {
                  const on = selected.includes(o.slug);
                  return (
                    <button
                      key={o.slug}
                      type="button"
                      role="option"
                      aria-selected={on}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] border-0 bg-transparent px-2.5 py-[9px] text-left text-[13.5px] font-medium text-foreground transition-colors duration-100 hover:bg-muted",
                        on && "font-semibold text-primary",
                      )}
                      data-selected={on}
                      onClick={() => onToggle(o.slug)}
                    >
                      <span
                        className={cn(
                          "grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.4px] border-border bg-card text-transparent",
                          on && "border-primary bg-primary text-white",
                        )}
                        aria-hidden
                      >
                        {on ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                      {o.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
