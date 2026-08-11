"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

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
    <div className="lms">
      <button
        type="button"
        className="lms-control"
        data-open={open}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="lms-values">
          {selected.length === 0 ? (
            <span className="lms-placeholder">{placeholder}</span>
          ) : (
            selected.map((slug) => (
              <span
                key={slug}
                className="lms-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) onToggle(slug);
                }}
              >
                {labelBySlug.get(slug) ?? slug}
                <span className="lms-chip-x" aria-hidden>
                  <X size={12} />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown size={16} className="lms-chev" aria-hidden />
      </button>

      {open && !disabled ? (
        <>
          <div className="lms-backdrop" onClick={() => setOpen(false)} />
          <div className="lms-panel" role="listbox" aria-multiselectable="true">
            <div className="lms-search">
              <Search size={14} aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search languages"
                autoFocus
              />
            </div>
            <div className="lms-options">
              {filtered.length === 0 ? (
                <div className="lms-empty">No matches</div>
              ) : (
                filtered.map((o) => {
                  const on = selected.includes(o.slug);
                  return (
                    <button
                      key={o.slug}
                      type="button"
                      role="option"
                      aria-selected={on}
                      className="lms-option"
                      data-selected={on}
                      onClick={() => onToggle(o.slug)}
                    >
                      <span className="lms-box" aria-hidden>
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
