"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AudienceBucket } from "../types";

/**
 * Audience primitives shared by every template.
 *
 * The eight designs draw the same three shapes — a labelled bar list for age, a
 * stacked split for gender, and a ranked percentage list for places — and vary
 * only in paint. Structure lives here; templates pass their own classes.
 */

type AgeBarsProps = {
  buckets: AudienceBucket[];
  /** Highlighted bucket, normally the largest. */
  topKey?: string;
  trackClassName?: string;
  barClassName?: string;
  topBarClassName?: string;
  labelClassName?: string;
};

/** Horizontal age distribution: label · track · percentage. */
export function AgeBars({
  buckets,
  topKey,
  trackClassName,
  barClassName,
  topBarClassName,
  labelClassName,
}: AgeBarsProps) {
  const peak = buckets.reduce((max, row) => Math.max(max, row.share), 0) || 1;

  return (
    <div className="flex flex-col gap-3">
      {buckets.map((bucket) => {
        const isTop = bucket.key === topKey;
        return (
          <div
            key={bucket.key}
            className="grid grid-cols-[3.25rem_minmax(0,1fr)_2.625rem] items-center gap-3 text-sm"
          >
            <span className={cn("text-gc-muted-soft", labelClassName)}>
              {bucket.key}
            </span>
            <div
              className={cn(
                "h-2 overflow-hidden rounded-full bg-gc-surface",
                trackClassName,
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full bg-gc-brand-muted transition-[width] duration-700",
                  barClassName,
                  isTop && (topBarClassName ?? "bg-gc-brand"),
                )}
                style={{ width: `${Math.max((bucket.share / peak) * 100, 2)}%` }}
              />
            </div>
            <b
              className={cn(
                "text-right",
                isTop ? "font-extrabold" : "font-semibold",
              )}
            >
              {bucket.share}%
            </b>
          </div>
        );
      })}
    </div>
  );
}

type GenderSplitProps = {
  buckets: AudienceBucket[];
  /** Segment colours in rank order; the last repeats for any overflow. */
  segmentClassNames?: string[];
  trackClassName?: string;
};

const DEFAULT_GENDER_SEGMENTS = [
  "bg-gc-brand",
  "bg-gc-ink",
  "bg-gc-brand-muted",
];

/** Stacked gender bar plus a legend row per bucket. */
export function GenderSplit({
  buckets,
  segmentClassNames = DEFAULT_GENDER_SEGMENTS,
  trackClassName,
}: GenderSplitProps) {
  const colourFor = (index: number) =>
    segmentClassNames[Math.min(index, segmentClassNames.length - 1)];

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-gc-surface",
          trackClassName,
        )}
      >
        {buckets.map((bucket, index) => (
          <div
            key={bucket.key}
            className={cn(
              "transition-[width] duration-700",
              colourFor(index),
            )}
            style={{ width: `${bucket.share}%` }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {buckets.map((bucket, index) => (
          <div
            key={bucket.key}
            className="flex items-center gap-2.5 text-[15px]"
          >
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                colourFor(index),
              )}
            />
            <span className="flex-1">{bucket.key}</span>
            <b>{bucket.share}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

type RankedListProps = {
  rows: AudienceBucket[];
  limit?: number;
  /** Renders a filled rank badge instead of a plain index. */
  badge?: boolean;
  rowClassName?: string;
  badgeClassName?: string;
  topBadgeClassName?: string;
};

/** Numbered "top cities / top countries" list with percentage values. */
export function RankedList({
  rows,
  limit = 5,
  badge = false,
  rowClassName,
  badgeClassName,
  topBadgeClassName,
}: RankedListProps) {
  return (
    <div className="flex flex-col">
      {rows.slice(0, limit).map((row, index) => (
        <div
          key={row.key}
          className={cn(
            "flex items-center gap-3 py-2.5 text-[15px]",
            index > 0 && "border-t border-gc-line-soft",
            rowClassName,
          )}
        >
          {badge ? (
            <span
              className={cn(
                "flex size-9.5 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                badgeClassName ?? "bg-white text-gc-ink",
                index === 0 && topBadgeClassName,
              )}
            >
              {index + 1}
            </span>
          ) : (
            <span className="w-6 shrink-0 text-[13px] text-gc-muted-faint">
              {index + 1}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{row.key}</span>
          <b>{row.share}%</b>
        </div>
      ))}
    </div>
  );
}

type PlaceTabsProps = {
  cities: AudienceBucket[];
  countries: AudienceBucket[];
  limit?: number;
  badge?: boolean;
  className?: string;
  activeTabClassName?: string;
  idleTabClassName?: string;
  trackClassName?: string;
  badgeClassName?: string;
  topBadgeClassName?: string;
};

/**
 * "Top cities / Top countries" with a segmented toggle.
 *
 * Several designs show one ranked list at a time behind a two-way switch; this
 * owns that state so templates stay presentational.
 */
export function PlaceTabs({
  cities,
  countries,
  limit = 5,
  badge = false,
  className,
  activeTabClassName = "bg-gc-ink text-white",
  idleTabClassName = "text-gc-muted-soft",
  trackClassName = "bg-white",
  badgeClassName,
  topBadgeClassName,
}: PlaceTabsProps) {
  const [tab, setTab] = useState<"Cities" | "Countries">("Cities");
  const rows = tab === "Countries" ? countries : cities;

  const tabs: Array<"Cities" | "Countries"> = [];
  if (cities.length > 0) tabs.push("Cities");
  if (countries.length > 0) tabs.push("Countries");
  if (tabs.length === 0) return null;

  const active = tabs.includes(tab) ? tab : tabs[0];
  const visible = active === "Countries" ? countries : rows;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[17px] font-bold">Top locations</span>
        {tabs.length > 1 && (
          <div
            className={cn(
              "flex gap-1 rounded-full p-0.75",
              trackClassName,
            )}
          >
            {tabs.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                aria-pressed={name === active}
                className={cn(
                  "h-8 rounded-full px-3.5 text-[13px] font-semibold transition",
                  name === active ? activeTabClassName : idleTabClassName,
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
      <RankedList
        rows={visible}
        limit={limit}
        badge={badge}
        badgeClassName={badgeClassName}
        topBadgeClassName={topBadgeClassName}
      />
    </div>
  );
}
