"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

import type {
  CreatorFacetDimension,
  CreatorFacetOption,
} from "@/features/creators/api/get-creator-facet-options";
import type { WizardFacetGroup } from "../wizard-config";

/**
 * One accordion block. On desktop the header is hidden and the body always
 * shows. On small screens only the open section's body is visible so Identity
 * and Pricing don't stack into a long scroll.
 */
export function WizardAccordionSection({
  id,
  title,
  required = false,
  summary,
  complete,
  open,
  onOpen,
  extra,
  children,
}: {
  id: string;
  title: string;
  required?: boolean;
  summary?: string;
  complete: boolean;
  open: boolean;
  onOpen: (id: string) => void;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="cw-acc" data-open={open} data-complete={complete}>
      <div className="cw-acc-head">
        <button
          type="button"
          className="cw-acc-toggle"
          aria-expanded={open}
          onClick={() => onOpen(id)}
        >
          <span className="cw-acc-mark" data-complete={complete} aria-hidden>
            {complete ? <Check size={12} strokeWidth={3} /> : null}
          </span>
          <span className="cw-acc-text">
            <span className="cw-acc-title">
              {title}
              {required ? <span className="cw-req"> *</span> : null}
            </span>
            {!open && summary ? (
              <span className="cw-acc-summary">{summary}</span>
            ) : null}
          </span>
        </button>
        {extra ? <div className="cw-acc-extra">{extra}</div> : null}
        <button
          type="button"
          className="cw-acc-chevron-btn"
          tabIndex={-1}
          aria-hidden
          onClick={() => onOpen(id)}
        >
          <ChevronDown size={18} className="cw-acc-chevron" />
        </button>
      </div>
      <div className="cw-acc-body">{children}</div>
    </section>
  );
}

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
