"use client";


import { Check, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CreatorLanguageFluency } from "@/features/creators/api/create-creator-profile";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";

import {
  fluencyOptions,
  type LanguageDraft,
} from "@/features/creators/hooks/creator-profile-form-utils";

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
}: {
  label: string;
  options: CreatorFacetOption[];
  selected: string[];
  disabled: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="pe-field">
      <label>
        {label.replaceAll('/', '|')}
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

export function LanguageRows({
  allLanguages,
  selected,
  disabled,
  onAddLanguage,
  onRemoveLanguage,
  onUpdateLanguageSlug,
  onFluencyChange,
}: {
  allLanguages: CreatorFacetOption[];
  selected: LanguageDraft[];
  disabled: boolean;
  onAddLanguage: (slug: string) => void;
  onRemoveLanguage: (index: number) => void;
  onUpdateLanguageSlug: (index: number, slug: string) => void;
  onFluencyChange: (index: number, fluency: CreatorLanguageFluency) => void;
}) {
  const usedSlugs = new Set(selected.map((l) => l.slug).filter(Boolean));
  const availableLanguages = allLanguages.filter((l) => !usedSlugs.has(l.slug));

  function addLanguage() {
    if (availableLanguages.length > 0) {
      onAddLanguage(availableLanguages[0].slug);
    } else {
      onAddLanguage("");
    }
  }

  return (
    <div className="pe-field">
      <label>Languages</label>
      <span className="pe-help">
        Add each language you can create in, with fluency.
      </span>
      <div className="pe-lang-list">
        {selected.map((lang, index) => (
          <div className="pe-lang-row" key={index}>
            <div className="pe-select-wrap" style={{ flex: 1 }}>
              <Select
                disabled={disabled}
                value={lang.slug === "" ? undefined : lang.slug}
                onValueChange={(newSlug) => {
                  onUpdateLanguageSlug(index, newSlug);
                }}
              >
                <SelectTrigger className="h-[42px] rounded-[10px] border-[1.4px] text-[13.5px]">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {allLanguages
                    .filter(
                      (l) => l.slug === lang.slug || !usedSlugs.has(l.slug),
                    )
                    .map((l) => (
                      <SelectItem key={l.slug} value={l.slug}>
                        {l.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pe-lang-flu">
              {fluencyOptions.map((fl) => (
                <button
                  key={fl.value}
                  type="button"
                  data-active={lang.fluency === fl.value}
                  disabled={disabled}
                  onClick={() => onFluencyChange(index, fl.value)}
                >
                  {fl.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="pe-lang-del"
              disabled={disabled}
              onClick={() => onRemoveLanguage(index)}
              aria-label="Remove language"
            >
              <X size={15} />
            </button>
          </div>
        ))}

        {availableLanguages.length > 0 ? (
          <button
            type="button"
            className="pe-add-link"
            disabled={disabled}
            onClick={addLanguage}
          >
            <Plus size={14} />
            Add language
          </button>
        ) : null}
      </div>
    </div>
  );
}
