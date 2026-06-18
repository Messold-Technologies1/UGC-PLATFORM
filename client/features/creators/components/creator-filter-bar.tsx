"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Film,
  Globe,
  Grid3X3,
  Search,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  useCreatorCategorySuggestionsQuery,
  useCreatorRestrictionSuggestionsQuery,
  useCreatorFacetOptionsQuery,
} from "../hooks/use-creator-suggestion-queries";
import {
  CREATOR_PRICE_MAX,
  CREATOR_PRICE_MIN,
  // DEFAULT_FILTERS,
  type Filters,
} from "../types/creator-filter-types";
import type { CreatorFacetOption } from "../api/get-creator-facet-options";

const PRICE_STEP = 250;

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "NON_BINARY", label: "Non-Binary" },
  { value: "OTHER", label: "Other" },
] as const;

const AGE_GROUP_OPTIONS = [
  { value: "AGE_18_24", label: "18 – 24" },
  { value: "AGE_25_34", label: "25 – 34" },
  { value: "AGE_35_44", label: "35 – 44" },
  { value: "AGE_45_54", label: "45 – 54" },
  { value: "AGE_55_PLUS", label: "55+" },
] as const;

const MORE_FACET_SECTIONS: {
  dimension: string;
  label: string;
  filterKey: keyof Filters;
}[] = [
  {
    dimension: "CONTENT_STYLE",
    label: "Content Style",
    filterKey: "contentStyle",
  },
  { dimension: "APPEARANCE", label: "Appearance", filterKey: "appearance" },
  { dimension: "CAPABILITY", label: "Capability", filterKey: "capability" },
  { dimension: "LIFE_STYLE", label: "Life Style", filterKey: "lifeStyle" },
  { dimension: "OCCUPATION", label: "Occupation", filterKey: "occupation" },
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
];

const SMART_SEARCH_EXAMPLES = [
  "Hindi skincare creator in Mumbai under ₹4000",
  "Cinematic tech unboxing with pro editing",
  "High-energy fitness creator with pro lighting",
  "Tamil food vlogger who can shoot on-location",
  "Parenting creator who can film with kids",
];

type ArrayFilterKey = Extract<
  keyof Filters,
  | "categories"
  | "restrictions"
  | "contentFormat"
  | "appearance"
  | "contentStyle"
  | "capability"
  | "lifeStyle"
  | "occupation"
  | "categoryExperience"
  | "canCreateWith"
  | "aiContentPermission"
  | "language"
>;

function formatFacetSlug(slug: string): string {
  if (!slug) return slug;
  return slug
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/\s*\/\s*/g, " & ")
    .replace(/\bAnd\b/g, "&");
}

function normalizeSelectedValues(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

interface FilterPopoverProps {
  id: string;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  label: string;
  icon: React.ReactNode;
  activeCount: number;
  wide?: boolean;
  alignRight?: boolean;
  children: React.ReactNode;
}

const FilterPopover = memo(function FilterPopover({
  id,
  openId,
  onOpenChange,
  label,
  icon,
  activeCount,
  wide,
  alignRight,
  children,
}: FilterPopoverProps) {
  const isOpen = openId === id;
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onOpenChange]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex h-[44px] items-center gap-2 whitespace-nowrap rounded-xl border bg-white px-3.5 text-[13.5px] font-semibold shadow-sm transition-colors",
          activeCount > 0
            ? "border-primary text-primary bg-primary/[0.06]"
            : "border-gray-200 text-foreground hover:bg-gray-50",
          isOpen && "ring-2 ring-primary/15",
        )}
        onClick={() => onOpenChange(isOpen ? null : id)}
      >
        {icon}
        {label}
        {activeCount > 0 && (
          <span className="flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 py-px text-[11px] font-extrabold text-white">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[44]"
            onClick={() => onOpenChange(null)}
            aria-hidden
          />

          <div
            role="dialog"
            className={cn(
              "absolute top-[calc(100%+9px)] z-[46] rounded-2xl border border-gray-200 bg-white p-4 shadow-lg filter-popover-enter",
              wide ? "w-[460px] max-w-[92vw]" : "w-[340px] max-w-[92vw]",
              alignRight ? "right-0" : "left-0",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
});

interface ChipGridProps {
  items: { slug: string; label: string }[];
  selected: string[];
  onToggle: (slug: string) => void;
}

const ChipGrid = memo(function ChipGrid({
  items,
  selected,
  onToggle,
}: ChipGridProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ slug, label }) => {
        const isOn = selected.includes(slug);
        return (
          <button
            key={slug}
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors",
              isOn
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 bg-white text-foreground hover:bg-gray-50",
            )}
            onClick={() => onToggle(slug)}
          >
            {isOn && <Check className="size-3.5 stroke-[3]" />}
            {label}
          </button>
        );
      })}
    </div>
  );
});

interface CheckboxRowProps {
  items: readonly { value: string; label: string }[];
  selected: string;
  onToggle: (value: string) => void;
  multi?: boolean;
}

const CheckboxRow = memo(function CheckboxRow({
  items,
  selected,
  onToggle,
}: CheckboxRowProps) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isOn = selected === item.value;
        return (
          <label
            key={item.value}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-gray-50"
          >
            <div
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                isOn
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 bg-white",
              )}
            >
              {isOn && <Check className="size-3 stroke-[3]" />}
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={isOn}
              onChange={() => onToggle(isOn ? "" : item.value)}
            />
            <span className="text-[13.5px] font-medium text-gray-700">
              {item.label}
            </span>
          </label>
        );
      })}
    </div>
  );
});

interface PriceRangeBodyProps {
  minPrice: string;
  maxPrice: string;
  onCommit: (min: string, max: string) => void;
}

const PriceRangeBody = memo(function PriceRangeBody({
  minPrice,
  maxPrice,
  onCommit,
}: PriceRangeBodyProps) {
  const lo = minPrice ? Number(minPrice) : CREATOR_PRICE_MIN;
  const hi = maxPrice ? Number(maxPrice) : CREATOR_PRICE_MAX;
  const [draft, setDraft] = useState<[number, number]>([lo, hi]);

  useEffect(() => {
    setDraft([lo, hi]);
  }, [lo, hi]);

  const handleCommit = useCallback(
    ([min, max]: number[]) => {
      const nextMin =
        (min ?? CREATOR_PRICE_MIN) <= CREATOR_PRICE_MIN ? "" : String(min);
      const nextMax =
        (max ?? CREATOR_PRICE_MAX) >= CREATOR_PRICE_MAX ? "" : String(max);
      onCommit(nextMin, nextMax);
    },
    [onCommit],
  );

  const presets: [string, number, number][] = [
    ["Under ₹1k", CREATOR_PRICE_MIN, 1000],
    ["₹1k – 2k", 1000, 2000],
    ["₹2k – 3k", 2000, 3000],
    ["₹3k+", 3000, CREATOR_PRICE_MAX],
  ];

  return (
    <div>
      <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
        Budget per video
      </h5>
      <div className="flex items-center justify-between text-[13px] font-semibold text-foreground">
        <span>₹{draft[0].toLocaleString("en-IN")}</span>
        <span>
          {draft[1] >= CREATOR_PRICE_MAX
            ? "₹10,000+"
            : `₹${draft[1].toLocaleString("en-IN")}`}
        </span>
      </div>
      <div className="px-1 py-3">
        <Slider
          min={CREATOR_PRICE_MIN}
          max={CREATOR_PRICE_MAX}
          step={PRICE_STEP}
          value={draft}
          onValueChange={(v) =>
            setDraft([v[0] ?? CREATOR_PRICE_MIN, v[1] ?? CREATOR_PRICE_MAX])
          }
          onValueCommit={handleCommit}
          trackClassName="h-1.5 bg-gray-100"
          rangeClassName="bg-primary"
          thumbClassName="size-4 border-2 border-white bg-primary shadow-md"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map(([label, a, b]) => {
          const isOn = draft[0] === a && draft[1] === b;
          return (
            <button
              key={label}
              type="button"
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                isOn
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 bg-white text-foreground hover:bg-gray-50",
              )}
              onClick={() => {
                setDraft([a, b]);
                handleCommit([a, b]);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

interface SmartSearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

const SmartSearchBar = memo(function SmartSearchBar({
  value,
  onChange,
  onSubmit,
}: SmartSearchBarProps) {
  const [query, setQuery] = useState(value ?? "");

  useEffect(() => {
    if (value !== undefined) setQuery(value);
  }, [value]);

  const handleSearchChange = (v: string) => {
    setQuery(v);
    onChange?.(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSubmit) {
      onSubmit(query);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            className="h-[44px] w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-8 text-[13.5px] font-medium text-foreground shadow-sm outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-gray-300 focus:ring-1 focus:ring-gray-200 disabled:opacity-100 disabled:cursor-default"
            placeholder="Describe the creator you need — niche, language, city, budget, style…"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled
            aria-label="Smart search is currently unavailable"
          />
          {query && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 flex size-[18px] -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-muted-foreground hover:bg-gray-200 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleSearchChange("")}
              aria-label="Clear"
              disabled
            >
              <X className="size-[12px]" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 min-h-[32px] xl:col-span-2 mt-2 xl:mt-0">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-foreground">
          <Zap className="size-[13px] text-primary" /> Try:
        </span>
        {SMART_SEARCH_EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled
            className="h-[30px] rounded-full border border-dashed border-gray-200 bg-white px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-gray-50 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-dashed disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-muted-foreground"
            onClick={() => {
              handleSearchChange(ex);
              onSubmit?.(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>
    </>
  );
});

interface ActiveChip {
  id: string;
  label: string;
  type: keyof Filters;
  value?: string;
}

function buildActiveChips(filters: Filters): ActiveChip[] {
  const chips: ActiveChip[] = [];

  if (filters.city)
    chips.push({
      id: `city-${filters.city}`,
      label: filters.city,
      type: "city",
    });
  if (filters.gender)
    chips.push({
      id: `gender-${filters.gender}`,
      label: formatFacetSlug(filters.gender),
      type: "gender",
    });
  if (filters.ageGroup)
    chips.push({
      id: `age-${filters.ageGroup}`,
      label: filters.ageGroup
        .replace("AGE_", "")
        .replace("_", "–")
        .replace("PLUS", "+"),
      type: "ageGroup",
    });

  const arrayKeys: { key: ArrayFilterKey; prefix: string }[] = [
    { key: "categories", prefix: "cat" },
    { key: "contentFormat", prefix: "cf" },
    { key: "contentStyle", prefix: "cs" },
    { key: "appearance", prefix: "ap" },
    { key: "capability", prefix: "cap" },
    { key: "lifeStyle", prefix: "ls" },
    { key: "occupation", prefix: "occ" },
    { key: "categoryExperience", prefix: "ce" },
    { key: "canCreateWith", prefix: "ccw" },
    { key: "aiContentPermission", prefix: "acp" },
    { key: "language", prefix: "lang" },
    { key: "restrictions", prefix: "restr" },
  ];

  for (const { key, prefix } of arrayKeys) {
    for (const v of filters[key]) {
      chips.push({
        id: `${prefix}-${v}`,
        label: formatFacetSlug(v),
        type: key,
        value: v,
      });
    }
  }

  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? Number(filters.minPrice) : CREATOR_PRICE_MIN;
    const max = filters.maxPrice ? Number(filters.maxPrice) : CREATOR_PRICE_MAX;
    const maxLabel =
      max >= CREATOR_PRICE_MAX ? "₹10k+" : `₹${(max / 1000).toFixed(0)}k`;
    chips.push({
      id: "price",
      label: `₹${(min / 1000).toFixed(0)}k – ${maxLabel}`,
      type: "minPrice",
    });
  }

  if (filters.onLocationAvailable)
    chips.push({
      id: "on-loc",
      label: "On-location",
      type: "onLocationAvailable",
    });

  if (filters.industry)
    chips.push({
      id: `ind-${filters.industry}`,
      label: `Industry: ${filters.industry}`,
      type: "industry",
    });

  if (filters.portfolioTag)
    chips.push({
      id: `pt-${filters.portfolioTag}`,
      label: `Tag: ${filters.portfolioTag}`,
      type: "portfolioTag",
    });

  return chips;
}

export interface CreatorFilterBarProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  search: string;
  onSearchChange: (next: string) => void;
  total: number;
  isPending: boolean;
  onClear: () => void;
  categoryOptions: string[];
  landingPage?: boolean;
}

export const CreatorFilterBar = memo(function CreatorFilterBar({
  filters,
  onChange,
  search,
  onSearchChange,
  total,
  isPending,
  onClear,
  categoryOptions,
  landingPage,
}: CreatorFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);
  const debouncedSearchChange = useDebouncedCallback((value: string) => {
    onSearchChange(value);
  }, 300);
  const [mode, setMode] = useState<"smart" | "manual">("manual");
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [localCity, setLocalCity] = useState(filters.city);
  useEffect(() => {
    setLocalCity(filters.city);
  }, [filters.city]);

  const [localIndustry, setLocalIndustry] = useState(filters.industry);
  useEffect(() => {
    setLocalIndustry(filters.industry);
  }, [filters.industry]);

  const [localPortfolioTag, setLocalPortfolioTag] = useState(
    filters.portfolioTag,
  );
  useEffect(() => {
    setLocalPortfolioTag(filters.portfolioTag);
  }, [filters.portfolioTag]);

  const debouncedCityChange = useDebouncedCallback((value: string) => {
    commitField("city", value.trim());
  }, 400);

  const debouncedIndustryChange = useDebouncedCallback((value: string) => {
    commitField("industry", value.trim());
  }, 400);

  const debouncedPortfolioTagChange = useDebouncedCallback((value: string) => {
    commitField("portfolioTag", value.trim());
  }, 400);

  const commitField = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange],
  );

  const toggleArrayField = useCallback(
    (key: ArrayFilterKey, value: string) => {
      const cur = filters[key];
      const next = cur.includes(value)
        ? cur.filter((x) => x !== value)
        : normalizeSelectedValues([...cur, value]);
      onChange({ ...filters, [key]: next });
    },
    [filters, onChange],
  );

  const chips = useMemo(() => buildActiveChips(filters), [filters]);
  const hasActiveFilters = chips.length > 0;

  const handleRemoveChip = useCallback(
    (chip: ActiveChip) => {
      if (chip.type === "minPrice") {
        onChange({ ...filters, minPrice: "", maxPrice: "" });
      } else if (chip.type === "onLocationAvailable") {
        onChange({ ...filters, onLocationAvailable: false });
      } else if (
        chip.type === "city" ||
        chip.type === "gender" ||
        chip.type === "ageGroup" ||
        chip.type === "industry" ||
        chip.type === "portfolioTag"
      ) {
        onChange({ ...filters, [chip.type]: "" });
      } else {
        const key = chip.type as ArrayFilterKey;
        onChange({
          ...filters,
          [key]: filters[key].filter((v) => v !== chip.value),
        });
      }
    },
    [filters, onChange],
  );

  const categorySuggestionsQuery = useCreatorCategorySuggestionsQuery({
    staleTime: 5 * 60_000,
  });
  const facetOptionsQuery = useCreatorFacetOptionsQuery({
    staleTime: 5 * 60_000,
  });
  const restrictionSuggestionsQuery = useCreatorRestrictionSuggestionsQuery({
    staleTime: 5 * 60_000,
  });

  const categoryItems = useMemo(() => {
    const items: { slug: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const item of categorySuggestionsQuery.data ?? []) {
      const label = item.name
        .trim()
        .replace(/\s*\/\s*/g, " & ")
        .replace(/\bAnd\b/g, "&");
      const slug =
        item.slug?.trim() ||
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
      if (!label || seen.has(slug)) continue;
      items.push({ slug, label });
      seen.add(slug);
    }
    for (const fallback of categoryOptions) {
      const label = fallback
        .trim()
        .replace(/\s*\/\s*/g, " & ")
        .replace(/\bAnd\b/g, "&");
      const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      if (!label || seen.has(slug)) continue;
      items.push({ slug, label });
      seen.add(slug);
    }
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryOptions, categorySuggestionsQuery.data]);

  const facetOptionsByDimension = facetOptionsQuery.data?.optionsByDimension;

  const facetItemsByDimension = useMemo(() => {
    const result: Record<string, { slug: string; label: string }[]> = {};
    const optionsMap = facetOptionsByDimension as
      | Record<string, CreatorFacetOption[]>
      | undefined;
    if (!optionsMap) return result;

    for (const [dim, options] of Object.entries(optionsMap)) {
      result[dim] = options.map((o) => ({
        slug: o.slug,
        label: o.label.replace(/\s*\/\s*/g, " & ").replace(/\bAnd\b/g, "&"),
      }));
    }
    return result;
  }, [facetOptionsByDimension]);

  const getFacetItems = useCallback(
    (dimension: string): { slug: string; label: string }[] => {
      return facetItemsByDimension[dimension] ?? [];
    },
    [facetItemsByDimension],
  );

  const restrictionNames = useMemo(
    () =>
      normalizeSelectedValues(
        (restrictionSuggestionsQuery.data ?? []).map((item) => item.name),
      ),
    [restrictionSuggestionsQuery.data],
  );

  const restrictionItems = useMemo(
    () => restrictionNames.map((n) => ({ slug: n, label: n })),
    [restrictionNames],
  );

  const categoryCount = filters.categories.length;
  const formatCount = filters.contentFormat.length;
  const langCount = filters.language.length;
  const genderCount = filters.gender ? 1 : 0;
  const priceCount = filters.minPrice || filters.maxPrice ? 1 : 0;

  const moreCount =
    filters.contentStyle.length +
    filters.appearance.length +
    filters.capability.length +
    filters.lifeStyle.length +
    filters.occupation.length +
    filters.categoryExperience.length +
    filters.canCreateWith.length +
    filters.aiContentPermission.length +
    filters.restrictions.length +
    (landingPage && filters.gender ? 1 : 0) +
    (filters.ageGroup ? 1 : 0) +
    (filters.onLocationAvailable ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.industry ? 1 : 0) +
    (filters.portfolioTag ? 1 : 0);

  const activeFilterCount = categoryCount + formatCount + langCount + genderCount + priceCount + moreCount;

  return (
    <div
      className="sticky top-0 z-40 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 2xl:-mx-12 border-b border-gray-200/80 bg-white/90 backdrop-blur-md backdrop-saturate-[1.6]"
      role="search"
      aria-label="Creator filters"
      {...(!landingPage ? { "data-tour": "brand-creators-filters" } : {})}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 lg:py-4">
        <div className="grid grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3">
          <div className="flex items-start">
            <div
              className="inline-flex gap-[3px] rounded-[13px] border border-gray-200 bg-gray-100/80 p-1"
              role="tablist"
              aria-label="Search mode"
            >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "smart"}
              className={cn(
                "inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-bold transition-colors",
                mode === "smart"
                  ? "bg-white text-foreground shadow-sm"
                  : "bg-transparent text-muted-foreground",
              )}
              onClick={() => setMode("smart")}
            >
              {/* <Sparkles
                className={cn(
                  "size-[15px]",
                  mode === "smart" && "text-primary",
                )}
              /> */}
              Smart search
              <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-extrabold tracking-wide text-white">
                AI
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "manual"}
              className={cn(
                "inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-bold transition-colors",
                mode === "manual"
                  ? "bg-white text-foreground shadow-sm"
                  : "bg-transparent text-muted-foreground",
              )}
              onClick={() => setMode("manual")}
            >
              <SlidersHorizontal
                className={cn(
                  "size-[15px]",
                  mode === "manual" && "text-primary",
                )}
              />
              Manual filters
            </button>
          </div>
        </div>

        {mode === "smart" ? (
            <SmartSearchBar
              onSubmit={(val) => {
                // TODO: Wire up smart search logic here once backend is ready
                console.log("Smart search query:", val);
              }}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[200px] flex-1 max-w-[480px]">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name, city or bio…"
                    value={localSearch}
                    onChange={(e) => {
                      setLocalSearch(e.target.value);
                      debouncedSearchChange(e.target.value);
                    }}
                    aria-label="Search creators by name, city or bio"
                    className="h-[44px] w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-9 text-[13.5px] font-medium text-foreground shadow-sm outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                  />
                  {localSearch && (
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 flex size-[18px] -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-muted-foreground hover:bg-gray-200 hover:text-foreground"
                      onClick={() => {
                        setLocalSearch("");
                        onSearchChange("");
                      }}
                      aria-label="Clear search"
                    >
                      <X className="size-[12px]" />
                    </button>
                  )}
                </div>

                <div className="hidden xl:flex flex-wrap items-center gap-2.5">
                <FilterPopover
                  id="category"
                  openId={openPopover}
                  onOpenChange={setOpenPopover}
                  label="Category"
                  icon={<Grid3X3 className="size-[15px]" />}
                  activeCount={categoryCount}
                  wide
                >
                  <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Content Category
                  </h5>
                  {categoryItems.length === 0 ? (
                    <p className="py-2 text-xs text-muted-foreground">
                      {categorySuggestionsQuery.isPending
                        ? "Loading…"
                        : "No categories available."}
                    </p>
                  ) : (
                    <ChipGrid
                      items={categoryItems}
                      selected={filters.categories}
                      onToggle={(slug) => toggleArrayField("categories", slug)}
                    />
                  )}
                </FilterPopover>

                <FilterPopover
                  id="format"
                  openId={openPopover}
                  onOpenChange={setOpenPopover}
                  label="Format"
                  icon={<Film className="size-[15px]" />}
                  activeCount={formatCount}
                >
                  <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Content Format
                  </h5>
                  <ChipGrid
                    items={getFacetItems("CONTENT_FORMAT")}
                    selected={filters.contentFormat}
                    onToggle={(slug) => toggleArrayField("contentFormat", slug)}
                  />
                </FilterPopover>

                <FilterPopover
                  id="price"
                  openId={openPopover}
                  onOpenChange={setOpenPopover}
                  label="Price"
                  icon={<Zap className="size-[15px]" />}
                  activeCount={priceCount}
                >
                  <PriceRangeBody
                    minPrice={filters.minPrice}
                    maxPrice={filters.maxPrice}
                    onCommit={(min, max) =>
                      onChange({ ...filters, minPrice: min, maxPrice: max })
                    }
                  />
                </FilterPopover>

                <FilterPopover
                  id="language"
                  openId={openPopover}
                  onOpenChange={setOpenPopover}
                  label="Language"
                  icon={<Globe className="size-[15px]" />}
                  activeCount={langCount}
                >
                  <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Language
                  </h5>
                  <ChipGrid
                    items={getFacetItems("LANGUAGE")}
                    selected={filters.language}
                    onToggle={(slug) => toggleArrayField("language", slug)}
                  />
                </FilterPopover>

                {!landingPage && (
                  <FilterPopover
                    id="gender"
                    openId={openPopover}
                    onOpenChange={setOpenPopover}
                    label="Gender"
                    icon={<User className="size-[15px]" />}
                    activeCount={genderCount}
                  >
                    <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      Gender
                    </h5>
                    <CheckboxRow
                      items={GENDER_OPTIONS}
                      selected={filters.gender}
                      onToggle={(v) => commitField("gender", v)}
                    />
                  </FilterPopover>
                )}

                <div className="mx-0.5 h-[26px] w-px bg-gray-200" aria-hidden />

                <FilterPopover
                  id="more"
                  openId={openPopover}
                  onOpenChange={setOpenPopover}
                  label="More filters"
                  icon={<SlidersHorizontal className="size-[15px]" />}
                  activeCount={moreCount}
                  wide
                  alignRight
                >
                  <div className="max-h-[60vh] overflow-y-auto overscroll-y-contain pr-1 [scrollbar-width:thin]">
                    {MORE_FACET_SECTIONS.map(
                      ({ dimension, label, filterKey }) => {
                        const items = getFacetItems(dimension);
                        if (items.length === 0) return null;
                        return (
                          <div key={dimension} className="mb-4">
                            <h5 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                              {label}
                            </h5>
                            <ChipGrid
                              items={items}
                              selected={filters[filterKey] as string[]}
                              onToggle={(slug) =>
                                toggleArrayField(
                                  filterKey as ArrayFilterKey,
                                  slug,
                                )
                              }
                            />
                          </div>
                        );
                      },
                    )}

                    {landingPage && (
                      <div className="mb-4">
                        <h5 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                          Gender
                        </h5>
                        <CheckboxRow
                          items={GENDER_OPTIONS}
                          selected={filters.gender}
                          onToggle={(v) => commitField("gender", v)}
                        />
                      </div>
                    )}

                    <div className="mb-4">
                      <h5 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                        Age Group
                      </h5>
                      <CheckboxRow
                        items={AGE_GROUP_OPTIONS}
                        selected={filters.ageGroup}
                        onToggle={(v) => commitField("ageGroup", v)}
                      />
                    </div>

                    {restrictionNames.length > 0 && (
                      <div className="mb-4">
                        <h5 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                          Restrictions
                        </h5>
                        <ChipGrid
                          items={restrictionItems}
                          selected={filters.restrictions}
                          onToggle={(slug) =>
                            toggleArrayField("restrictions", slug)
                          }
                        />
                      </div>
                    )}

                    <div className="mb-4">
                      <h5 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                        Location
                      </h5>
                      <Input
                        placeholder="e.g. Mumbai, Delhi, Bengaluru"
                        value={localCity}
                        onChange={(e) => {
                          setLocalCity(e.target.value);
                          debouncedCityChange(e.target.value);
                        }}
                        className="h-9 rounded-lg border-gray-200 bg-white text-[13px] shadow-none"
                      />
                    </div>

                    <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                      <div>
                        <div className="text-[13px] font-semibold text-foreground">
                          On-location shoots
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">
                          Films at your store or venue
                        </div>
                      </div>
                      <Switch
                        checked={filters.onLocationAvailable}
                        onCheckedChange={(checked) =>
                          commitField("onLocationAvailable", checked)
                        }
                      />
                    </div>

                    <div className="mb-4">
                      <h5 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                        Industry
                      </h5>
                      <Input
                        placeholder="Search industry"
                        value={localIndustry}
                        onChange={(e) => {
                          setLocalIndustry(e.target.value);
                          debouncedIndustryChange(e.target.value);
                        }}
                        className="h-9 rounded-lg border-gray-200 bg-white text-[13px] shadow-none"
                      />
                    </div>

                    <div className="mb-4">
                      <h5 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                        Portfolio Tag
                      </h5>
                      <Input
                        placeholder="Search tag"
                        value={localPortfolioTag}
                        onChange={(e) => {
                          setLocalPortfolioTag(e.target.value);
                          debouncedPortfolioTagChange(e.target.value);
                        }}
                        className="h-9 rounded-lg border-gray-200 bg-white text-[13px] shadow-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 border-t border-gray-200 pt-3.5 mt-1">
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-gray-50"
                      onClick={onClear}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-lg bg-foreground px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-foreground/90"
                      onClick={() => setOpenPopover(null)}
                    >
                      Show {isPending ? "…" : total}
                    </button>
                  </div>
                </FilterPopover>
                </div>

                <div className="flex xl:hidden">
                  <Drawer>
                    <DrawerTrigger asChild>
                      <button className="inline-flex h-[44px] items-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3.5 text-[13.5px] font-semibold text-foreground shadow-sm transition-colors hover:bg-gray-50">
                        <SlidersHorizontal className="size-[15px]" />
                        Filters
                        {activeFilterCount > 0 && (
                          <span className="flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 py-px text-[11px] font-extrabold text-white">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[90vh]">
                      <DrawerHeader className="text-left pb-2">
                        <DrawerTitle>Filters</DrawerTitle>
                        <DrawerDescription>
                          Refine your search to find the perfect creator.
                        </DrawerDescription>
                      </DrawerHeader>
                      <div className="overflow-y-auto px-4 py-2 [scrollbar-width:thin] flex flex-col gap-6">
                        <div>
                          <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Content Category</h5>
                          {categoryItems.length > 0 && (
                            <ChipGrid items={categoryItems} selected={filters.categories} onToggle={(slug) => toggleArrayField("categories", slug)} />
                          )}
                        </div>
                        <div>
                          <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Content Format</h5>
                          <ChipGrid items={getFacetItems("CONTENT_FORMAT")} selected={filters.contentFormat} onToggle={(slug) => toggleArrayField("contentFormat", slug)} />
                        </div>
                        <div>
                          <PriceRangeBody minPrice={filters.minPrice} maxPrice={filters.maxPrice} onCommit={(min, max) => onChange({ ...filters, minPrice: min, maxPrice: max })} />
                        </div>
                        <div>
                          <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Language</h5>
                          <ChipGrid items={getFacetItems("LANGUAGE")} selected={filters.language} onToggle={(slug) => toggleArrayField("language", slug)} />
                        </div>
                        {!landingPage && (
                          <div>
                            <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Gender</h5>
                            <CheckboxRow items={GENDER_OPTIONS} selected={filters.gender} onToggle={(v) => commitField("gender", v)} />
                          </div>
                        )}
                        <div className="h-px bg-gray-200" aria-hidden />
                        {MORE_FACET_SECTIONS.map(({ dimension, label, filterKey }) => {
                          const items = getFacetItems(dimension);
                          if (items.length === 0) return null;
                          return (
                            <div key={dimension}>
                              <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">{label}</h5>
                              <ChipGrid items={items} selected={filters[filterKey] as string[]} onToggle={(slug) => toggleArrayField(filterKey as ArrayFilterKey, slug)} />
                            </div>
                          );
                        })}
                        {landingPage && (
                          <div>
                            <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Gender</h5>
                            <CheckboxRow items={GENDER_OPTIONS} selected={filters.gender} onToggle={(v) => commitField("gender", v)} />
                          </div>
                        )}
                        <div>
                          <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Age Group</h5>
                          <CheckboxRow items={AGE_GROUP_OPTIONS} selected={filters.ageGroup} onToggle={(v) => commitField("ageGroup", v)} />
                        </div>
                        {restrictionNames.length > 0 && (
                          <div>
                            <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Restrictions</h5>
                            <ChipGrid items={restrictionItems} selected={filters.restrictions} onToggle={(slug) => toggleArrayField("restrictions", slug)} />
                          </div>
                        )}
                        <div>
                          <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Location</h5>
                          <Input placeholder="e.g. Mumbai, Delhi, Bengaluru" value={localCity} onChange={(e) => { setLocalCity(e.target.value); debouncedCityChange(e.target.value); }} className="h-10 rounded-lg border-gray-200 bg-white text-[13px] shadow-sm" />
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 border border-gray-100">
                          <div>
                            <div className="text-[13px] font-semibold text-foreground">On-location shoots</div>
                            <div className="text-[11.5px] text-muted-foreground">Films at your store or venue</div>
                          </div>
                          <Switch checked={filters.onLocationAvailable} onCheckedChange={(checked) => commitField("onLocationAvailable", checked)} />
                        </div>
                        <div>
                          <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Industry</h5>
                          <Input placeholder="Search industry" value={localIndustry} onChange={(e) => { setLocalIndustry(e.target.value); debouncedIndustryChange(e.target.value); }} className="h-10 rounded-lg border-gray-200 bg-white text-[13px] shadow-sm" />
                        </div>
                        <div>
                          <h5 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Portfolio Tag</h5>
                          <Input placeholder="Search tag" value={localPortfolioTag} onChange={(e) => { setLocalPortfolioTag(e.target.value); debouncedPortfolioTagChange(e.target.value); }} className="h-10 rounded-lg border-gray-200 bg-white text-[13px] shadow-sm" />
                        </div>
                      </div>
                      <DrawerFooter className="pt-4 border-t mt-2">
                        <div className="flex gap-3 w-full">
                          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClear}>Reset</Button>
                          <DrawerClose asChild>
                            <Button className="flex-1 rounded-xl">Show {isPending ? "…" : total}</Button>
                          </DrawerClose>
                        </div>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                </div>
              </div>

              <AnimatePresence>
                {hasActiveFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="xl:col-span-2 overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-2 mt-2.5 xl:mt-0 pt-1 pb-1">
                      <span className="text-[13.5px] font-bold text-foreground">
                        {isPending
                          ? "Searching…"
                          : `${total.toLocaleString()} creators`}
                      </span>

                      <div
                        className="mx-1 h-[18px] w-px bg-gray-200"
                        aria-hidden
                      />
                      <AnimatePresence mode="popLayout">
                        {chips.map((chip) => (
                          <motion.span
                            layout
                            key={chip.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary/8 px-2.5 py-1 text-[13px] font-medium text-foreground"
                          >
                            {chip.label}
                            <button
                              type="button"
                              onClick={() => handleRemoveChip(chip)}
                              className="text-foreground/70 transition-colors hover:text-foreground"
                              aria-label={`Remove ${chip.label}`}
                            >
                              <X className="size-[10px] stroke-[2.5]" />
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                      <button
                        type="button"
                        onClick={onClear}
                        className="ml-1 rounded-md border border-gray-200 bg-white px-3 py-1 text-[13px] font-medium text-primary transition-colors hover:bg-gray-50"
                      >
                        Clear all
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
    </div>
  </div>
  );
});
