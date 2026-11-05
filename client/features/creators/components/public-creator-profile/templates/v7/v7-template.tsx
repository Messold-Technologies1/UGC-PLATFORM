"use client";

import { Globe, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgeCurveChart, GenderDonut } from "../shared/audience-charts";
import { RankedList } from "../shared/audience-parts";
import { GradientShell } from "../v6/gradient-shell";
import type { PublicProfileViewModel } from "../types";

type TemplateProps = { model: PublicProfileViewModel };

/**
 * v7 "Signal" — the gradient layout with a dark, chart-led audience section:
 * an age curve, a gender donut and icon-led locations.
 *
 * The design arrived desktop-only; the mobile layout is derived here by letting
 * the same panels reflow, which is how the sibling v6 mobile design behaves.
 */
export function V7Template({ model }: TemplateProps) {
  const { audience } = model;

  const miniStats = audience
    ? [
        { label: "Reach", value: audience.reachLabel },
        { label: "Profile views", value: audience.profileViewsLabel },
      ].filter((stat): stat is { label: string; value: string } =>
        Boolean(stat.value),
      )
    : [];

  const restGender = audience?.gender.slice(1, 3) ?? [];

  return (
    <GradientShell
      model={model}
      showTrustLine
      audienceSlot={
        audience ? (
          <section id="audience" className="flex flex-col gap-3 pt-10">
            <div className="flex items-center justify-between px-1">
              <h2 className="m-0 text-2xl font-bold tracking-[-0.025em]">
                Instagram audience
              </h2>
              <span className="flex h-6.5 items-center rounded-[7px] bg-[#141414] px-2.5 text-xs font-semibold text-white">
                30 days
              </span>
            </div>

            <div className="flex items-baseline gap-2 px-1">
              <span className="text-[2.5rem] font-extrabold leading-none tracking-[-0.04em]">
                {audience.followersLabel}
              </span>
              <span className="text-[15px] text-gc-muted-faint">Followers</span>
            </div>

            {miniStats.length > 0 && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {miniStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col gap-2.5 rounded-gc-md bg-[#F2F2F2] px-4 py-3.5"
                  >
                    <span className="text-sm text-gc-muted-soft">
                      {stat.label}
                    </span>
                    <span className="text-2xl font-extrabold tracking-[-0.03em]">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {audience.ages.length > 1 && (
              <div className="flex flex-col gap-3 rounded-gc-lg bg-[#141414] p-4 pt-4.5 text-white shadow-[0_10px_0_-4px_#E4E4E4]">
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-semibold">
                    Audience age
                  </span>
                  <span className="text-[13px] text-white/60">
                    Tap an age group
                  </span>
                </div>
                <AgeCurveChart buckets={audience.ages} />
              </div>
            )}

            {audience.gender.length > 0 && (
              <div className="mt-1.5 grid gap-2.5 sm:grid-cols-2">
                <div className="flex flex-col items-center justify-center gap-3 rounded-gc-md bg-[#141414] p-4 text-white sm:row-span-2">
                  <GenderDonut buckets={audience.gender} />
                  <div className="text-center">
                    <div className="text-[15px] font-semibold">
                      {audience.gender[0].key}
                    </div>
                    <div className="text-[13px] text-white/60">
                      Largest gender group
                    </div>
                  </div>
                </div>
                {restGender.map((bucket, index) => (
                  <div
                    key={bucket.key}
                    className={cn(
                      "flex min-h-27.5 flex-col justify-between rounded-gc-md px-4 py-3.5 text-white",
                      index === 0 ? "bg-gc-brand" : "bg-[#2A2A2A]",
                    )}
                  >
                    <span className="flex size-7.5 items-center justify-center rounded-[9px] bg-white/18">
                      <User className="size-4" />
                    </span>
                    <div>
                      <div className="text-sm opacity-85">{bucket.key}</div>
                      <div className="text-[22px] font-extrabold tracking-[-0.02em]">
                        {bucket.share}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(audience.cities.length > 0 || audience.countries.length > 0) && (
              <div className="mt-2.5">
                <span className="px-1 text-[17px] font-bold">
                  Top locations
                </span>
                <div className="mt-1 flex flex-col gap-1">
                  {(audience.cities.length > 0
                    ? audience.cities
                    : audience.countries
                  )
                    .slice(0, 5)
                    .map((row, index) => (
                      <div
                        key={row.key}
                        className="flex items-center gap-3.5 px-1 py-2.5"
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#141414] text-white">
                          {audience.cities.length > 0 ? (
                            <MapPin className="size-4.5" />
                          ) : (
                            <Globe className="size-4.5" />
                          )}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.25">
                          <span className="truncate text-base font-semibold">
                            {row.key}
                          </span>
                          <span className="text-[13px] text-gc-muted-faint">
                            #{index + 1}{" "}
                            {audience.cities.length > 0 ? "city" : "country"}
                          </span>
                        </div>
                        <b className="text-base">{row.share}%</b>
                      </div>
                    ))}
                </div>
                {audience.cities.length > 0 &&
                  audience.countries.length > 0 && (
                    <div className="mt-3 rounded-gc-md bg-[#F2F2F2] px-4.5 pb-1.5 pt-2.5">
                      <span className="text-[15px] font-semibold">
                        Top countries
                      </span>
                      <RankedList rows={audience.countries} />
                    </div>
                  )}
              </div>
            )}
          </section>
        ) : null
      }
    />
  );
}
