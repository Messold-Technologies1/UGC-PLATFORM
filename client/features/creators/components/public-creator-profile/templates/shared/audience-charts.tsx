"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AudienceBucket } from "../types";

/** Catmull-Rom-ish smoothing so the age curve reads as one continuous line. */
function smoothPath(points: [number, number][]): string {
  return points.reduce((path, point, index, all) => {
    if (index === 0) return `M${point[0]} ${point[1]}`;
    const previous2 = all[index - 2] ?? all[index - 1];
    const previous = all[index - 1];
    const next = all[index + 1] ?? point;
    const control1 = [
      previous[0] + (point[0] - previous2[0]) / 6,
      previous[1] + (point[1] - previous2[1]) / 6,
    ];
    const control2 = [
      point[0] - (next[0] - previous[0]) / 6,
      point[1] - (next[1] - previous[1]) / 6,
    ];
    return `${path} C${control1.join(" ")} ${control2.join(" ")} ${point.join(" ")}`;
  }, "");
}

type AgeCurveChartProps = {
  buckets: AudienceBucket[];
  className?: string;
};

/**
 * Age distribution as a curve with a selectable point, on a dark card.
 *
 * Used by the templates whose audience section is a dark panel rather than a
 * bar list. Tapping an age pill moves the marker.
 */
export function AgeCurveChart({ buckets, className }: AgeCurveChartProps) {
  const peakIndex = buckets.reduce(
    (best, row, index) => (row.share > buckets[best].share ? index : best),
    0,
  );
  const [selected, setSelected] = useState<number | null>(null);
  const activeIndex = selected ?? peakIndex;

  if (buckets.length < 2) return null;

  const width = 320;
  const height = 150;
  const padX = 14;
  const top = 34;
  const bottom = 128;
  const peak = buckets[peakIndex].share || 1;

  const points: [number, number][] = buckets.map((bucket, index) => [
    padX + (index * (width - padX * 2)) / (buckets.length - 1),
    bottom - (bucket.share / peak) * (bottom - top),
  ]);

  const marker = points[activeIndex];
  const label = `${buckets[activeIndex].share}%`;
  const tagWidth = 14 + label.length * 8;
  const tagX = Math.min(
    Math.max(marker[0] - tagWidth / 2, 2),
    width - tagWidth - 2,
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        className="block overflow-visible"
        role="img"
        aria-label="Audience age distribution"
      >
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={0}
            x2={width}
            y1={top + (bottom - top) * fraction}
            y2={top + (bottom - top) * fraction}
            stroke="rgba(255,255,255,.1)"
            strokeDasharray="3 5"
          />
        ))}
        <line
          x1={marker[0]}
          x2={marker[0]}
          y1={marker[1]}
          y2={bottom + 10}
          stroke="rgba(232,56,79,.5)"
          strokeDasharray="2 4"
        />
        <path
          d={smoothPath(points)}
          fill="none"
          stroke="#fff"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle
          cx={marker[0]}
          cy={marker[1]}
          r={7}
          fill="#E8384F"
          stroke="#fff"
          strokeWidth={3}
        />
        <rect
          x={tagX}
          y={marker[1] - 34}
          width={tagWidth}
          height={22}
          rx={6}
          fill="#E8384F"
        />
        <text
          x={tagX + tagWidth / 2}
          y={marker[1] - 19}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight={700}
        >
          {label}
        </text>
      </svg>

      <div className="flex justify-between gap-1">
        {buckets.map((bucket, index) => (
          <button
            key={bucket.key}
            type="button"
            onClick={() => setSelected(index)}
            aria-pressed={index === activeIndex}
            className={cn(
              "h-8 flex-1 rounded-[9px] text-[11px] font-semibold transition",
              index === activeIndex
                ? "bg-white text-gc-ink"
                : "bg-white/8 text-white/70 hover:bg-white/15",
            )}
          >
            {bucket.key.replace("–", "-")}
          </button>
        ))}
      </div>
    </div>
  );
}

type GenderDonutProps = {
  buckets: AudienceBucket[];
  className?: string;
};

/** Donut showing the largest gender group's share, on a dark card. */
export function GenderDonut({ buckets, className }: GenderDonutProps) {
  if (buckets.length === 0) return null;
  const largest = buckets[0];
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn("relative size-30", className)}
      role="img"
      aria-label={`${largest.key}: ${largest.share}% of the audience`}
    >
      <svg viewBox="0 0 120 120" className="block size-30 -rotate-90">
        <circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,.12)"
          strokeWidth={10}
        />
        <circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          stroke="#E8384F"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - largest.share / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[28px] font-extrabold tracking-[-0.03em]">
          {largest.share}%
        </span>
      </div>
    </div>
  );
}
