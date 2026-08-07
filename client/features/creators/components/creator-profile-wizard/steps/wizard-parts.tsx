"use client";

import { Check } from "lucide-react";

import type { CreatorFacetDimension } from "@/features/creators/api/get-creator-facet-options";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";
import type { WizardFacetGroup } from "../wizard-config";

type SelectedFacets = Partial<
  Record<Exclude<CreatorFacetDimension, "LANGUAGE">, string[]>
>;

/**
 * Renders a list of facet groups as design-styled chip sections. Selection is
 * driven by the shared facets hook so every dimension persists together.
 * `onToggle` receives the group (so callers can enforce per-group max limits).
 */
export function FacetGroups({
  groups,
  optionsByDimension,
  selectedFacets,
  disabled,
  onToggle,
}: {
  groups: WizardFacetGroup[];
  optionsByDimension: Partial<Record<CreatorFacetDimension, CreatorFacetOption[]>>;
  selectedFacets: SelectedFacets;
  disabled: boolean;
  onToggle: (group: WizardFacetGroup, slug: string) => void;
}) {
  return (
    <>
      {groups.map((group, index) => {
        const options = optionsByDimension[group.dimension] ?? [];
        if (options.length === 0) return null;
        const selected = selectedFacets[group.dimension] ?? [];
        return (
          <div key={group.dimension}>
            {index > 0 ? <div className="cw-hr cw-hr-soft" /> : null}
            <div className="cw-facet">
              <div className="cw-facet-label">
                <span>
                  {group.label.replaceAll("/", "|")}
                  {group.required ? <span className="cw-req"> *</span> : null}
                </span>
                {group.max ? (
                  <span className="cw-facet-max">Maximum {group.max}</span>
                ) : selected.length > 0 ? (
                  <span className="cw-facet-count">{selected.length}</span>
                ) : null}
              </div>
              {group.help ? (
                <span className="cw-facet-help">{group.help}</span>
              ) : null}
              <div className="pe-chips">
                {options.map((opt) => {
                  const isOn = selected.includes(opt.slug);
                  const atCap =
                    !isOn &&
                    group.max != null &&
                    selected.length >= group.max;
                  return (
                    <button
                      key={opt.slug}
                      type="button"
                      className="pe-chip"
                      data-selected={isOn}
                      disabled={disabled || atCap}
                      onClick={() => onToggle(group, opt.slug)}
                    >
                      {isOn ? (
                        <span className="pe-chip-tick">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      ) : null}
                      {opt.label.replaceAll("/", "|")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
