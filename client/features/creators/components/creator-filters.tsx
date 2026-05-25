"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { BookmarkPlus, ChevronDown, Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  useCreatorCategorySuggestionsQuery,
  // useCreatorPersonaTagSuggestionsQuery,
  useCreatorRestrictionSuggestionsQuery,
  useCreatorFacetOptionsQuery,
} from "../hooks/use-creator-suggestion-queries";
import type { CreatorFacetOption } from "../api/get-creator-facet-options";

export const CREATOR_PRICE_MIN = 0;
export const CREATOR_PRICE_MAX = 10_000;
const PRICE_STEP = 500;
const DEFAULT_OPEN_SECTIONS: string[] = [];

const GENDER_OPTIONS = [
  {
    value: "MALE",
    label: "Male",
    description: "Show creators who identify as male.",
  },
  {
    value: "FEMALE",
    label: "Female",
    description: "Show creators who identify as female.",
  },
  {
    value: "NON_BINARY",
    label: "Non-Binary",
    description: "Show non-binary creators.",
  },
  {
    value: "PREFER_NOT_TO_SAY",
    label: "Prefer not to say",
    description: "Creators who prefer not to disclose gender.",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Include creators using any other gender label.",
  },
] as const;

const AGE_GROUP_OPTIONS = [
  { value: "", label: "Any age" },
  { value: "AGE_18_24", label: "18 – 24" },
  { value: "AGE_25_34", label: "25 – 34" },
  { value: "AGE_35_44", label: "35 – 44" },
  { value: "AGE_45_54", label: "45 – 54" },
  { value: "AGE_55_PLUS", label: "55+" },
] as const;

const FACET_SECTION_CONFIG: {
  dimension: string;
  label: string;
  filterKey: keyof Pick<
    Filters,
    | "contentFormat"
    | "appearance"
    | "contentStyle"
    | "capability"
    | "lifeStyle"
    | "occupation"
    | "interest"
    | "categoryExperience"
    | "canCreateWith"
    | "aiContentPermission"
    | "language"
  >;
}[] = [
  {
    dimension: "CONTENT_FORMAT",
    label: "Content Format",
    filterKey: "contentFormat",
  },
  {
    dimension: "CONTENT_STYLE",
    label: "Content Style",
    filterKey: "contentStyle",
  },
  { dimension: "APPEARANCE", label: "Appearance", filterKey: "appearance" },
  { dimension: "CAPABILITY", label: "Capability", filterKey: "capability" },
  { dimension: "LIFE_STYLE", label: "Life Style", filterKey: "lifeStyle" },
  { dimension: "OCCUPATION", label: "Occupation", filterKey: "occupation" },
  { dimension: "INTEREST", label: "Interest", filterKey: "interest" },
  {
    dimension: "CATEGORY_EXPERIENCE",
    label: "Category Experience",
    filterKey: "categoryExperience",
  },
  {
    dimension: "CAN_CREATE_WITH",
    label: "Can Create With",
    filterKey: "canCreateWith",
  },
  {
    dimension: "AI_CONTENT_PERMISSION",
    label: "AI Content Permission",
    filterKey: "aiContentPermission",
  },
  { dimension: "LANGUAGE", label: "Language", filterKey: "language" },
];

export interface Filters {
  city: string;
  categories: string[];
  gender: string;
  minPrice: string;
  maxPrice: string;
  onLocationAvailable: boolean;
  industry: string;
  portfolioTag: string;
  // personaTags: string[];
  restrictions: string[];
  // Facet-based filters (slugs sent to API)
  contentFormat: string[];
  appearance: string[];
  contentStyle: string[];
  capability: string[];
  lifeStyle: string[];
  occupation: string[];
  interest: string[];
  categoryExperience: string[];
  canCreateWith: string[];
  aiContentPermission: string[];
  language: string[];
  ageGroup: string;
}

export const DEFAULT_FILTERS: Filters = {
  city: "",
  categories: [],
  gender: "",
  minPrice: "",
  maxPrice: "",
  onLocationAvailable: false,
  industry: "",
  portfolioTag: "",
  // personaTags: [],
  restrictions: [],
  contentFormat: [],
  appearance: [],
  contentStyle: [],
  capability: [],
  lifeStyle: [],
  occupation: [],
  interest: [],
  categoryExperience: [],
  canCreateWith: [],
  aiContentPermission: [],
  language: [],
  ageGroup: "",
};

interface CreatorFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  categoryOptions: string[];
  className?: string;
}

function normalizeSelectedValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

type MultiSelectFilterKey =
  | "categories"
  // | "personaTags"
  | "restrictions"
  | "contentFormat"
  | "appearance"
  | "contentStyle"
  | "capability"
  | "lifeStyle"
  | "occupation"
  | "interest"
  | "categoryExperience"
  | "canCreateWith"
  | "aiContentPermission"
  | "language";

export const CreatorFilters = memo(function CreatorFilters({
  filters,
  onChange,
  categoryOptions,
  className,
}: CreatorFiltersProps) {
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const [prevCity, setPrevCity] = useState(draftFilters.city);
  const [localCity, setLocalCity] = useState(draftFilters.city);
  if (draftFilters.city !== prevCity) {
    setPrevCity(draftFilters.city);
    setLocalCity(draftFilters.city);
  }

  const [prevIndustry, setPrevIndustry] = useState(draftFilters.industry);
  const [localIndustry, setLocalIndustry] = useState(draftFilters.industry);
  if (draftFilters.industry !== prevIndustry) {
    setPrevIndustry(draftFilters.industry);
    setLocalIndustry(draftFilters.industry);
  }

  const [prevPortfolioTag, setPrevPortfolioTag] = useState(
    draftFilters.portfolioTag,
  );
  const [localPortfolioTag, setLocalPortfolioTag] = useState(
    draftFilters.portfolioTag,
  );
  if (draftFilters.portfolioTag !== prevPortfolioTag) {
    setPrevPortfolioTag(draftFilters.portfolioTag);
    setLocalPortfolioTag(draftFilters.portfolioTag);
  }

  const [prevMinPrice, setPrevMinPrice] = useState(draftFilters.minPrice);
  const [prevMaxPrice, setPrevMaxPrice] = useState(draftFilters.maxPrice);
  const [priceDraft, setPriceDraft] = useState<[number, number]>([
    draftFilters.minPrice ? Number(draftFilters.minPrice) : CREATOR_PRICE_MIN,
    draftFilters.maxPrice ? Number(draftFilters.maxPrice) : CREATOR_PRICE_MAX,
  ]);
  if (
    draftFilters.minPrice !== prevMinPrice ||
    draftFilters.maxPrice !== prevMaxPrice
  ) {
    setPrevMinPrice(draftFilters.minPrice);
    setPrevMaxPrice(draftFilters.maxPrice);
    setPriceDraft([
      draftFilters.minPrice ? Number(draftFilters.minPrice) : CREATOR_PRICE_MIN,
      draftFilters.maxPrice ? Number(draftFilters.maxPrice) : CREATOR_PRICE_MAX,
    ]);
  }

  const categorySuggestionsQuery = useCreatorCategorySuggestionsQuery({
    staleTime: 5 * 60_000,
  });

  // const personaSuggestionsQuery = useCreatorPersonaTagSuggestionsQuery({
  //   staleTime: 5 * 60_000,
  // });

  const restrictionSuggestionsQuery = useCreatorRestrictionSuggestionsQuery({
    staleTime: 5 * 60_000,
  });

  const facetOptionsQuery = useCreatorFacetOptionsQuery({
    staleTime: 5 * 60_000,
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const toggleShowMore = useCallback((sectionKey: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  }, []);

  const handleChange = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setDraftFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const debouncedCityChange = useDebouncedCallback((value: string) => {
    handleChange("city", value.trim());
  }, 400);

  const debouncedIndustryChange = useDebouncedCallback((value: string) => {
    handleChange("industry", value.trim());
  }, 400);

  const debouncedPortfolioTagChange = useDebouncedCallback((value: string) => {
    handleChange("portfolioTag", value.trim());
  }, 400);

  const toggleMultiSelect = useCallback(
    (key: MultiSelectFilterKey, value: string) => {
      setDraftFilters((prev) => {
        const currentValues = prev[key];
        const nextValues = currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : normalizeSelectedValues([...currentValues, value]);
        return { ...prev, [key]: nextValues };
      });
    },
    [],
  );

  const handlePriceCommit = useCallback(([min, max]: number[]) => {
    setDraftFilters((prev) => ({
      ...prev,
      minPrice: min <= CREATOR_PRICE_MIN ? "" : String(min),
      maxPrice: max >= CREATOR_PRICE_MAX ? "" : String(max),
    }));
  }, []);

  const categoryNames = useMemo(() => {
    const fromQuery =
      categorySuggestionsQuery.data
        ?.map((item) => item.name.trim())
        .filter(Boolean) ?? [];
    const fallback = categoryOptions.map((item) => item.trim()).filter(Boolean);
    return normalizeSelectedValues([...fromQuery, ...fallback]);
  }, [categoryOptions, categorySuggestionsQuery.data]);

  // const personaNames = useMemo(
  //   () =>
  //     normalizeSelectedValues(
  //       (personaSuggestionsQuery.data ?? []).map((item) => item.name),
  //     ),
  //   [personaSuggestionsQuery.data],
  // );

  const restrictionNames = useMemo(
    () =>
      normalizeSelectedValues(
        (restrictionSuggestionsQuery.data ?? []).map((item) => item.name),
      ),
    [restrictionSuggestionsQuery.data],
  );

  const facetOptionsByDimension = facetOptionsQuery.data?.optionsByDimension;

  return (
    <aside className={cn("flex h-full w-full max-w-[260px] flex-col overflow-hidden rounded-[10px] border border-gray-200/60 bg-white px-5 pt-5 pb-5 lg:h-[calc(100vh-7rem)] shadow-[0_2px_8px_rgba(0,0,0,0.02)]", className)}>
      <div className="flex shrink-0 items-center justify-between pb-3">
        <h3 className="text-[16px] font-bold tracking-tight text-[#111]">
          Filters
        </h3>
        <button
          type="button"
          onClick={() => {
            setDraftFilters(DEFAULT_FILTERS);
            onChange(DEFAULT_FILTERS);
          }}
          className="text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Accordion
          type="multiple"
          defaultValue={DEFAULT_OPEN_SECTIONS}
          className="space-y-0"
        >
          <DropdownFilterSection value="category" label="Content Category">
            {categoryNames.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No category suggestions are available right now.
              </p>
            ) : (
              <CheckboxList
                items={categoryNames}
                selected={draftFilters.categories}
                onToggle={(v) => toggleMultiSelect("categories", v)}
                sectionKey="category"
                expanded={expandedSections.has("category")}
                onToggleExpand={() => toggleShowMore("category")}
              />
            )}
          </DropdownFilterSection>

          {/* <DropdownFilterSection value="persona-tags" label="Persona Tags">
            {personaNames.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No persona tag suggestions are available right now.
              </p>
            ) : (
              <CheckboxList
                items={personaNames}
                selected={draftFilters.personaTags}
                onToggle={(v) => toggleMultiSelect("personaTags", v)}
                sectionKey="persona-tags"
                expanded={expandedSections.has("persona-tags")}
                onToggleExpand={() => toggleShowMore("persona-tags")}
              />
            )}
          </DropdownFilterSection> */}

          {FACET_SECTION_CONFIG.map(({ dimension, label, filterKey }) => {
            const options: CreatorFacetOption[] =
              (
                facetOptionsByDimension as
                  | Record<string, CreatorFacetOption[]>
                  | undefined
              )?.[dimension] ?? [];

            return (
              <DropdownFilterSection
                key={dimension}
                value={dimension}
                label={label}
              >
                {options.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {facetOptionsQuery.isPending
                      ? "Loading options…"
                      : "No options available."}
                  </p>
                ) : (
                  <CheckboxList
                    items={options.map((o) => o.slug)}
                    labels={Object.fromEntries(
                      options.map((o) => [o.slug, o.label]),
                    )}
                    selected={draftFilters[filterKey]}
                    onToggle={(v) => toggleMultiSelect(filterKey, v)}
                    sectionKey={dimension}
                    expanded={expandedSections.has(dimension)}
                    onToggleExpand={() => toggleShowMore(dimension)}
                  />
                )}
              </DropdownFilterSection>
            );
          })}

          <DropdownFilterSection value="location" label="Location">
            <div className="pb-2">
              <Input
                placeholder="e.g. Mumbai, Bengaluru, Delhi"
                value={localCity}
                onChange={(event) => {
                  setLocalCity(event.target.value);
                  debouncedCityChange(event.target.value);
                }}
                className="h-9 rounded-md border-gray-200 bg-white text-[13px] mt-1 shadow-none"
              />
            </div>
          </DropdownFilterSection>

          <DropdownFilterSection value="restrictions" label="Restrictions">
            <div className="space-y-1">
              {restrictionNames.map((label) => (
                <CheckboxItem
                  key={label}
                  label={label}
                  checked={draftFilters.restrictions.includes(label)}
                  onChange={() => toggleMultiSelect("restrictions", label)}
                />
              ))}
            </div>
          </DropdownFilterSection>

          <DropdownFilterSection value="availability" label="Availability">
            <div className="flex items-center justify-between py-1">
              <span className="text-[13px] font-medium text-[#374151]">
                On-Location
              </span>
              <Switch
                checked={draftFilters.onLocationAvailable}
                onCheckedChange={(checked) =>
                  handleChange("onLocationAvailable", checked)
                }
              />
            </div>
          </DropdownFilterSection>

          <DropdownFilterSection value="price-range" label="Price Range">
            <div className="px-1 py-2">
              <Slider
                min={CREATOR_PRICE_MIN}
                max={CREATOR_PRICE_MAX}
                step={PRICE_STEP}
                value={priceDraft}
                onValueChange={(value) =>
                  setPriceDraft([
                    value[0] ?? CREATOR_PRICE_MIN,
                    value[1] ?? CREATOR_PRICE_MAX,
                  ])
                }
                onValueCommit={handlePriceCommit}
                trackClassName="h-1 bg-gray-100"
                rangeClassName="bg-primary"
                thumbClassName="size-4 border-2 border-white bg-primary shadow-sm"
              />
              <div className="flex items-center justify-between text-[11px] font-medium text-[#6B7280] mt-3">
                <span>₹{CREATOR_PRICE_MIN.toLocaleString("en-IN")}</span>
                <span>₹10,000+</span>
              </div>
            </div>
          </DropdownFilterSection>

          <DropdownFilterSection value="gender" label="Gender">
            <div className="space-y-1">
              {GENDER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 py-1 cursor-pointer hover:opacity-80"
                >
                  <div
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                      draftFilters.gender === option.value
                        ? "border-primary bg-primary"
                        : "border-gray-300 bg-white",
                    )}
                  >
                    {draftFilters.gender === option.value && (
                      <div className="size-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <input
                    type="radio"
                    className="hidden"
                    checked={draftFilters.gender === option.value}
                    onChange={() =>
                      handleChange(
                        "gender",
                        draftFilters.gender === option.value
                          ? ""
                          : option.value,
                      )
                    }
                  />
                  <span className="text-[13px] font-medium text-[#374151]">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </DropdownFilterSection>

          <DropdownFilterSection value="age-group" label="Age Group">
            <div className="pb-2">
              <select
                value={draftFilters.ageGroup}
                onChange={(e) => handleChange("ageGroup", e.target.value)}
                className="w-full h-9 rounded-md border border-gray-200 bg-white text-[13px] px-3 mt-1 shadow-none focus:outline-none focus:ring-1 focus:ring-primary text-[#374151]"
              >
                {AGE_GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </DropdownFilterSection>

          <DropdownFilterSection value="video" label="Video">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  Industry
                </p>
                <Input
                  placeholder="Search industry"
                  value={localIndustry}
                  onChange={(event) => {
                    setLocalIndustry(event.target.value);
                    debouncedIndustryChange(event.target.value);
                  }}
                  className="h-9 rounded-md border-gray-200 bg-white text-[13px] shadow-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  Portfolio Tag
                </p>
                <Input
                  placeholder="Search tag"
                  value={localPortfolioTag}
                  onChange={(event) => {
                    setLocalPortfolioTag(event.target.value);
                    debouncedPortfolioTagChange(event.target.value);
                  }}
                  className="h-9 rounded-md border-gray-200 bg-white text-[13px] shadow-none"
                />
              </div>
            </div>
          </DropdownFilterSection>
        </Accordion>
      </div>

      <div className="pt-5 mt-2 border-t border-gray-100 space-y-3 shrink-0">
        <Button
          className="h-8 w-full rounded-[8px] bg-[#111] font-semibold text-white shadow-none hover:bg-black/90"
          onClick={() => onChange(draftFilters)}
        >
          Apply Filters
        </Button>
        <Button
          variant="outline"
          className="h-8 w-full rounded-[8px] border-gray-200 font-semibold text-[#374151] shadow-none hover:bg-gray-50"
          onClick={() => {}}
        >
          <BookmarkPlus className="mr-2 size-4 text-[#4B5563]" />
          Save Search
        </Button>
      </div>
    </aside>
  );
});

const DropdownFilterSection = memo(function DropdownFilterSection({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className="border-b border-gray-200 last:border-0"
    >
      <AccordionTrigger className="px-0 py-[14px] hover:no-underline">
        <span className="text-[14px] font-bold text-[#111]">{label}</span>
        <ChevronDown className="chevron size-4 text-[#6B7280] transition-transform duration-200" />
      </AccordionTrigger>
      <AccordionContent className="px-0 pb-4 pt-0">{children}</AccordionContent>
    </AccordionItem>
  );
});

const CheckboxItem = memo(function CheckboxItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer hover:opacity-70">
      <div
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-gray-300 bg-white",
        )}
      >
        {checked && (
          <svg className="size-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <input
        type="checkbox"
        className="hidden"
        checked={checked}
        onChange={onChange}
      />
      <span className="text-[13.5px] font-medium text-[#374151]">{label}</span>
    </label>
  );
});

const CheckboxList = memo(function CheckboxList({
  items,
  labels,
  selected,
  onToggle,
  // sectionKey,
  expanded,
  onToggleExpand,
  initialCount = 5,
}: {
  items: string[];
  labels?: Record<string, string>;
  selected: string[];
  onToggle: (value: string) => void;
  sectionKey: string;
  expanded: boolean;
  onToggleExpand: () => void;
  initialCount?: number;
}) {
  const visibleItems = expanded ? items : items.slice(0, initialCount);

  return (
    <div className="space-y-1">
      {visibleItems.map((item) => (
        <CheckboxItem
          key={item}
          label={labels?.[item] ?? item}
          checked={selected.includes(item)}
          onChange={() => onToggle(item)}
        />
      ))}
      {items.length > initialCount && (
        <button
          onClick={onToggleExpand}
          className="text-[13px] font-semibold text-primary hover:text-primary/80 mt-2 flex items-center gap-1.5"
        >
          <Plus
            className={cn(
              "size-3.5 stroke-3 transition-transform",
              expanded && "rotate-45",
            )}
          />
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
});
