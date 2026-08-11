"use client";


import { Check } from "lucide-react";

import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";

import { formatContentPreferenceLabel } from "@/features/creators/lib/format-content-preference-label";

export type CreatorProfileUpdateFormProps = {
  variant: "onboarding" | "settings";
  mode: "update";
  profileId?: string;
  adminMode?: boolean;
  initialProfile?: CreatorProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};

export function FacetChipSection({
  label,
  options,
  selected,
  disabled,
  onToggle,
  required,
}: {
  label: string;
  options: CreatorFacetOption[];
  selected: string[];
  disabled: boolean;
  onToggle: (slug: string) => void;
  required?: boolean;
}) {
  return (
    <div className="pe-field">
      <label>
        {label.replaceAll('/', '|')}
        {required ? (
          <span className="pe-required" aria-label="required" title="Required to go live">
            {' '}*
          </span>
        ) : null}
        {selected.length > 0 ? (
          <span className="pe-field-count">{selected.length}</span>
        ) : null}
      </label>
      <div className="pe-chips">
        {options.map((opt) => {
          const isOn = selected.includes(opt.slug);
          return (
            <button
              key={opt.slug}
              type="button"
              className="pe-chip"
              data-selected={isOn}
              disabled={disabled}
              onClick={() => onToggle(opt.slug)}
            >
              {isOn ? (
                <span className="pe-chip-tick">
                  <Check size={13} strokeWidth={3} />
                </span>
              ) : null}
              {opt.label.replaceAll('/', '|')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RestrictionChipSection({
  label,
  items,
  selected,
  disabled,
  onToggle,
  help,
}: {
  label: string;
  items: string[];
  selected: string[];
  disabled: boolean;
  onToggle: (name: string) => void;
  help?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="pe-field">
      <label>
        {label}
        {selected.length > 0 ? (
          <span className="pe-field-count">{selected.length}</span>
        ) : null}
      </label>
      {help ? <span className="pe-help">{help}</span> : null}
      <div className="pe-chips">
        {items.map((name) => {
          const isOn = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              className="pe-chip"
              data-selected={isOn}
              disabled={disabled}
              onClick={() => onToggle(name)}
            >
              {isOn ? (
                <span className="pe-chip-tick">
                  <Check size={13} strokeWidth={3} />
                </span>
              ) : null}
              {formatContentPreferenceLabel(name)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
