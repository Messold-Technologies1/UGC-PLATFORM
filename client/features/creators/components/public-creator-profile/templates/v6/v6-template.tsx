"use client";

import { cn } from "@/lib/utils";
import { AgeBars, PlaceTabs } from "../shared/audience-parts";
import { GradientShell } from "./gradient-shell";
import type { PublicProfileViewModel } from "../types";

type TemplateProps = { model: PublicProfileViewModel };

/** Gender tiles: the largest group in brand red, the rest in soft tints. */
const GENDER_TILES = [
  "bg-gc-brand text-white",
  "bg-gc-tint-sky text-gc-tint-sky-ink",
  "bg-gc-tint-violet text-gc-tint-violet-ink",
];

/**
 * v6 "Pastel" — the gradient layout with a light audience section: age bars, a
 * three-up gender split and ranked locations.
 */
export function V6Template({ model }: TemplateProps) {
  const { audience } = model;

  return (
    <GradientShell
      model={model}
      audienceSlot={
        audience ? (
          <section id="audience" className="flex flex-col gap-2.5 pt-10">
            <div className="flex items-baseline justify-between px-0.5">
              <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">
                Instagram audience
              </h2>
              <span className="text-[13px] text-gc-muted-faint">
                Last 30 days
              </span>
            </div>

            {audience.ages.length > 0 && (
              <div className="flex flex-col gap-3 rounded-gc-md bg-[#F4F4F5] p-4.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-semibold">Age</span>
                  {audience.topAge && (
                    <span className="text-[13px] text-gc-muted-faint">
                      Largest · {audience.topAge.key} ({audience.topAge.share}%)
                    </span>
                  )}
                </div>
                <AgeBars
                  buckets={audience.ages}
                  topKey={audience.topAge?.key}
                  trackClassName="bg-[#eee]"
                  barClassName="bg-[#F6C9D2]"
                  topBarClassName="bg-[linear-gradient(90deg,#FF7A90,#E8384F)]"
                />
              </div>
            )}

            {audience.gender.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {audience.gender.slice(0, 3).map((bucket, index) => (
                  <div
                    key={bucket.key}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-gc-md px-3 py-3.5",
                      GENDER_TILES[index] ?? GENDER_TILES[2],
                    )}
                  >
                    <span className="text-2xl font-extrabold tracking-[-0.02em]">
                      {bucket.share}%
                    </span>
                    <span className="text-[13px] opacity-85">{bucket.key}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-gc-md bg-[#F4F4F5] px-4.5 pb-1.5 pt-2.5">
              <PlaceTabs
                cities={audience.cities}
                countries={audience.countries}
                trackClassName="bg-[#F2F2F2]"
              />
            </div>
          </section>
        ) : null
      }
    />
  );
}
