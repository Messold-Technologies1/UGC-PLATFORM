"use client";

import { cn } from "@/lib/utils";
import { AgeBars, GenderSplit, RankedList } from "./audience-parts";
import type { PublicProfileAudience } from "../types";

type AudienceOutlinedProps = {
  audience: PublicProfileAudience;
  className?: string;
};

/**
 * Instagram audience block in the outlined-card treatment: a three-up stat
 * strip over gender, age and ranked place cards. Shared by the templates that
 * use hairline borders rather than filled surfaces.
 */
export function AudienceOutlined({
  audience,
  className,
}: AudienceOutlinedProps) {
  const stats = [
    { label: "Followers", value: audience.followersLabel },
    { label: "Reach", value: audience.reachLabel },
    { label: "Profile views", value: audience.profileViewsLabel },
  ].filter((stat): stat is { label: string; value: string } =>
    Boolean(stat.value),
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {stats.length > 0 && (
        <div className="grid grid-cols-3 overflow-hidden rounded-gc-md border border-gc-line">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn("p-5", index > 0 && "border-l border-gc-line")}
            >
              <div className="text-[clamp(1.625rem,3vw,2.125rem)] font-extrabold leading-none tracking-[-0.03em]">
                {stat.value}
              </div>
              <div className="mt-1.5 text-sm text-gc-muted-soft">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))]">
        {audience.gender.length > 0 && (
          <div className="flex flex-col gap-3.5 rounded-gc-md border border-gc-line p-5">
            <div className="text-[17px] font-bold">Gender</div>
            <GenderSplit buckets={audience.gender} />
          </div>
        )}
        {audience.ages.length > 0 && (
          <div className="flex flex-col gap-3 rounded-gc-md border border-gc-line p-5">
            <div className="text-[17px] font-bold">Age</div>
            <AgeBars buckets={audience.ages} topKey={audience.topAge?.key} />
          </div>
        )}
        {audience.cities.length > 0 && (
          <div className="flex flex-col rounded-gc-md border border-gc-line p-5">
            <div className="mb-1.5 text-[17px] font-bold">Top cities</div>
            <RankedList rows={audience.cities} />
          </div>
        )}
        {audience.countries.length > 0 && (
          <div className="flex flex-col rounded-gc-md border border-gc-line p-5">
            <div className="mb-1.5 text-[17px] font-bold">Top countries</div>
            <RankedList rows={audience.countries} />
          </div>
        )}
      </div>
    </div>
  );
}
