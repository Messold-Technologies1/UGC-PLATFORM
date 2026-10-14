"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

import type {
  CreatorFacetDimension,
  CreatorFacetOption,
} from "@/features/creators/api/get-creator-facet-options";
import { cn } from "@/lib/utils";
import type { WizardFacetGroup } from "../wizard-config";
import {
  CwFacet,
  CwFacetCount,
  CwFacetHelp,
  CwFacetLabel,
  CwHr,
  CwReq,
} from "../wizard-ui";

const chipBaseClass =
  "inline-flex h-8 max-sm:h-10 items-center gap-1.5 rounded-full border-[1.4px] px-3 max-sm:px-3.5 text-[12.5px] max-sm:text-[13.5px] font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

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
    <section
      className={cn(
        "max-[960px]:overflow-hidden max-[960px]:rounded-[14px] max-[960px]:border-[1.4px] max-[960px]:border-border max-[960px]:bg-card",
        open &&
          "max-[960px]:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))]",
      )}
      data-open={open}
      data-complete={complete}
    >
      <div className="hidden max-[960px]:flex max-[960px]:items-center max-[960px]:gap-2 max-[960px]:py-3 max-[960px]:pl-3.5 max-[960px]:pr-2">
        <button
          type="button"
          className="flex w-full min-w-0 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left text-inherit max-[960px]:py-0.5"
          aria-expanded={open}
          onClick={() => onOpen(id)}
        >
          <span
            className={cn(
              "flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.4px] border-border bg-background text-white",
              complete && "border-primary bg-primary",
            )}
            aria-hidden
          >
            {complete ? <Check size={12} strokeWidth={3} /> : null}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-bold text-foreground">
              {title}
              {required ? (
                <>
                  {" "}
                  <CwReq />
                </>
              ) : null}
            </span>
            {!open && summary ? (
              <span className="truncate text-xs font-medium text-muted-foreground">
                {summary}
              </span>
            ) : null}
          </span>
        </button>
        {extra ? <div className="shrink-0">{extra}</div> : null}
        <button
          type="button"
          className="hidden shrink-0 cursor-pointer border-0 bg-transparent p-1 text-inherit max-[960px]:flex"
          tabIndex={-1}
          aria-hidden
          onClick={() => onOpen(id)}
        >
          <ChevronDown
            size={18}
            className={cn(
              "shrink-0 text-muted-foreground transition-transform duration-[180ms] ease-in-out",
              open && "rotate-180",
            )}
          />
        </button>
      </div>
      <div
        className={cn(
          "flex flex-col gap-2.5",
          !open && "max-[960px]:hidden",
          open &&
            "max-[960px]:-mt-0.5 max-[960px]:border-t max-[960px]:border-border max-[960px]:px-3.5 max-[960px]:pb-3.5 max-[960px]:pt-3",
        )}
      >
        {children}
      </div>
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
            {index > 0 ? <CwHr soft className="my-1" /> : null}
            <CwFacet>
              <CwFacetLabel>
                <span className="inline-flex min-w-0 items-center gap-1">
                  {group.label.replaceAll("/", "|")}
                  {group.required ? (
                    <>
                      {" "}
                      <CwReq />
                    </>
                  ) : null}
                </span>
                {group.max ? (
                  <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                    Maximum {group.max}
                  </span>
                ) : selected.length > 0 ? (
                  <CwFacetCount className="ml-auto">{selected.length}</CwFacetCount>
                ) : null}
              </CwFacetLabel>
              {group.help ? (
                <CwFacetHelp className="-mt-1">{group.help}</CwFacetHelp>
              ) : null}
              <div className="flex flex-wrap gap-[7px] max-sm:gap-2">
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
                      className={cn(
                        chipBaseClass,
                        isOn
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-card text-foreground hover:border-primary/45",
                      )}
                      disabled={disabled || atCap}
                      onClick={() => onToggle(group, opt.slug)}
                    >
                      {isOn ? (
                        <span className="grid place-items-center">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      ) : null}
                      {opt.label.replaceAll("/", "|")}
                    </button>
                  );
                })}
              </div>
            </CwFacet>
          </div>
        );
      })}
    </>
  );
}
