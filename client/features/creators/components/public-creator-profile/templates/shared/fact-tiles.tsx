"use client";

import { cn } from "@/lib/utils";
import type { PublicProfileFact } from "../types";

/** Per-fact tint, keyed to the dimension so colour is stable across templates. */
const FACT_TINTS: Record<string, { tile: string; icon: string }> = {
  CONTENT_CATEGORY: { tile: "bg-gc-tint-rose", icon: "text-gc-brand" },
  CREATOR_TYPE: { tile: "bg-gc-tint-violet", icon: "text-gc-tint-violet-ink" },
  OCCUPATION: { tile: "bg-gc-tint-amber", icon: "text-gc-tint-amber-ink" },
  APPEARANCE: { tile: "bg-[#FCE3F3]", icon: "text-[#C93D96]" },
  ON_LOCATION: { tile: "bg-gc-tint-mint", icon: "text-gc-tint-mint-ink" },
  LANGUAGE: { tile: "bg-gc-tint-sky", icon: "text-gc-tint-sky-ink" },
  WORKED_WITH: { tile: "bg-gc-surface-alt", icon: "text-gc-muted" },
};

const FALLBACK_TINT = { tile: "bg-gc-surface-alt", icon: "text-gc-muted" };

/**
 * A tile claims two of six columns, or four when it carries several values, so
 * chips do not wrap awkwardly. The last tile stretches to close the row.
 */
function spanFor(valueCount: number): string {
  return valueCount > 1 ? "sm:col-span-4" : "sm:col-span-2";
}

type FactTilesProps = {
  facts: PublicProfileFact[];
  openTo?: string[];
  className?: string;
  tileClassName?: string;
  chipClassName?: string;
};

/**
 * Tinted "About this creator" tiles.
 *
 * Shared by the templates that present facts as a colour-coded mosaic rather
 * than a table. Tints are keyed to the facet dimension so the same fact reads
 * the same colour in every template that uses this layout.
 */
export function FactTiles({
  facts,
  openTo,
  className,
  tileClassName,
  chipClassName,
}: FactTilesProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-6", className)}>
      {facts.map((fact) => {
        const Icon = fact.icon;
        const tint = FACT_TINTS[fact.key] ?? FALLBACK_TINT;
        const isSingle = fact.values.length === 1;
        return (
          <div
            key={fact.key}
            className={cn(
              "flex min-h-29.5 flex-col gap-3 rounded-gc-md p-4 transition-transform duration-200 hover:-translate-y-0.5",
              tint.tile,
              spanFor(fact.values.length),
              tileClassName,
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
                <Icon className={cn("size-[18px]", tint.icon)} />
              </span>
              <span className="text-[13px] font-semibold text-gc-muted">
                {fact.label}
              </span>
            </div>
            {isSingle ? (
              <div className="mt-auto flex items-center gap-2 text-[19px] font-bold tracking-[-0.015em]">
                {fact.key === "ON_LOCATION" && (
                  <span
                    className={cn(
                      "size-2.25 shrink-0 rounded-full",
                      fact.available ? "bg-gc-success" : "bg-[#b4afb8]",
                    )}
                  />
                )}
                {fact.values[0]}
              </div>
            ) : (
              <div className="mt-auto flex flex-wrap gap-1.5">
                {fact.values.map((value) => (
                  <span
                    key={value}
                    className={cn(
                      "rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gc-ink",
                      chipClassName,
                    )}
                  >
                    {value}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {openTo && openTo.length > 0 && (
        <div
          className={cn(
            "flex min-h-29.5 flex-col gap-3 rounded-gc-md bg-gc-surface-alt p-4 sm:col-span-6",
            tileClassName,
          )}
        >
          <span className="text-[13px] font-semibold text-gc-muted">
            Open to
          </span>
          <div className="mt-auto flex flex-wrap gap-1.5">
            {openTo.map((item) => (
              <span
                key={item}
                className={cn(
                  "rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gc-ink",
                  chipClassName,
                )}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
