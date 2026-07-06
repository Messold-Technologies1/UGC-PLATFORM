"use client";

import "./instagram-insights.css";
import { Instagram, Users, Share2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemographicBucketApi } from "@/features/creators/api/social-connections";
import type { PublicInstagramInsightsApi } from "@/features/creators/api/instagram-insights";

const GENDER_META: Record<string, { label: string; color: string }> = {
  F: { label: "Women", color: "var(--ig-women)" },
  M: { label: "Men", color: "var(--ig-men)" },
  U: { label: "Unspecified", color: "var(--ig-unspec)" },
};

const AGE_COLORS = [
  "#38bdf8",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#a3e635",
  "#f59e0b",
  "#64748b",
];

let regionNames: Intl.DisplayNames | null = null;
function countryName(code: string): string {
  if (regionNames === null) {
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function formatCompact(n?: number): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pct(bucket: DemographicBucketApi, total: number): number {
  const share = bucket.share ?? (total > 0 ? bucket.value / total : 0);
  return Math.round(share * 100);
}

function sum(buckets: DemographicBucketApi[]): number {
  return buckets.reduce((a, b) => a + b.value, 0);
}

function ageLeadingNumber(key: string): number {
  const m = /^(\d+)/.exec(key);
  return m ? Number(m[1]) : 999;
}

function GenderDonut({ buckets }: { buckets: DemographicBucketApi[] }) {
  const total = sum(buckets);
  if (total <= 0) return null;
  // Donut segments in the incoming (value-desc) order.
  let acc = 0;
  const stops: string[] = [];
  for (const b of buckets) {
    const start = (acc / total) * 100;
    acc += b.value;
    const end = (acc / total) * 100;
    const color = GENDER_META[b.key]?.color ?? "var(--ig-unspec)";
    stops.push(`${color} ${start}% ${end}%`);
  }
  const top = buckets[0];
  return (
    <div className="ig-gender">
      <div
        className="ig-donut"
        style={{ background: `conic-gradient(${stops.join(",")})` }}
        role="img"
        aria-label="Audience gender split"
      >
        <div className="ig-donut-center">
          <span className="ig-donut-pct">{pct(top, total)}%</span>
          <span className="ig-donut-key">
            {GENDER_META[top.key]?.label ?? top.key}
          </span>
        </div>
      </div>
      <div className="ig-legend">
        {buckets.map((b) => (
          <div key={b.key} className="ig-legend-row">
            <span
              className="ig-dot"
              style={{
                background: GENDER_META[b.key]?.color ?? "var(--ig-unspec)",
              }}
            />
            <span>{GENDER_META[b.key]?.label ?? b.key}</span>
            <span className="ig-legend-pct">{pct(b, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgeBars({ buckets }: { buckets: DemographicBucketApi[] }) {
  const total = sum(buckets);
  const ordered = [...buckets].sort(
    (a, b) => ageLeadingNumber(a.key) - ageLeadingNumber(b.key),
  );
  const max = Math.max(...ordered.map((b) => b.value), 1);
  return (
    <div className="ig-bars">
      {ordered.map((b, i) => (
        <div key={b.key} className="ig-bar-row">
          <span className="ig-bar-key">{b.key}</span>
          <span className="ig-bar-track">
            <span
              className="ig-bar-fill"
              style={{
                width: `${(b.value / max) * 100}%`,
                background: AGE_COLORS[i % AGE_COLORS.length],
              }}
            />
          </span>
          <span className="ig-bar-pct">{pct(b, total)}%</span>
        </div>
      ))}
    </div>
  );
}

function RankedList({
  buckets,
  limit,
  kind,
}: {
  buckets: DemographicBucketApi[];
  limit: number;
  kind: "city" | "country";
}) {
  const total = sum(buckets);
  const rows = buckets.slice(0, limit);
  const max = Math.max(...rows.map((b) => b.value), 1);
  return (
    <div className="ig-rank">
      {rows.map((b, i) => {
        const label =
          kind === "country"
            ? `${b.key.toUpperCase()} · ${countryName(b.key)}`
            : b.key;
        return (
          <div key={b.key} className="ig-rank-row">
            <span className="ig-rank-num">{i + 1}</span>
            <span className="ig-rank-label" title={label}>
              {label}
            </span>
            <span className="ig-rank-track">
              <span
                className="ig-rank-fill"
                style={{ width: `${(b.value / max) * 100}%` }}
              />
            </span>
            <span className="ig-rank-pct">{pct(b, total)}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function hasInstagramInsightsData(
  insights: PublicInstagramInsightsApi | null | undefined,
): insights is PublicInstagramInsightsApi {
  if (!insights?.connected) return false;
  return (
    insights.followers != null ||
    insights.reach != null ||
    insights.gender.length > 0 ||
    insights.ageRanges.length > 0 ||
    insights.topCities.length > 0 ||
    insights.topCountries.length > 0
  );
}

export function InstagramInsights({
  insights,
  variant = "full",
  showHeader = true,
  className,
}: {
  insights: PublicInstagramInsightsApi;
  variant?: "full" | "compact";
  showHeader?: boolean;
  className?: string;
}) {
  if (!hasInstagramInsightsData(insights)) return null;
  const compact = variant === "compact";
  const rankLimit = compact ? 3 : 5;
  const reachLabel = compact ? "Reach" : "Reach (30d)";
  const viewsLabel = compact ? "Profile views" : "Profile views (30d)";

  return (
    <div className={cn("ig-insights", compact && "ig-compact", className)}>
      {showHeader && (
        <div className="ig-head">
          <span className="ig-badge">
            <Instagram size={compact ? 16 : 18} />
          </span>
          <h3>{compact ? "Instagram audience" : "Instagram insights"}</h3>
          {insights.followers != null && (
            <span className="ig-head-followers">
              {formatCompact(insights.followers)} followers
            </span>
          )}
        </div>
      )}

      <div className="ig-tiles">
        <div className="ig-tile">
          <span className="ig-tile-ic">
            <Users size={16} />
          </span>
          <span>
            <span className="ig-tile-val">
              {formatCompact(insights.followers)}
            </span>
            <span className="ig-tile-lbl">Followers</span>
          </span>
        </div>
        <div className="ig-tile">
          <span className="ig-tile-ic">
            <Share2 size={16} />
          </span>
          <span>
            <span className="ig-tile-val">{formatCompact(insights.reach)}</span>
            <span className="ig-tile-lbl">{reachLabel}</span>
          </span>
        </div>
        <div className="ig-tile">
          <span className="ig-tile-ic">
            <Eye size={16} />
          </span>
          <span>
            <span className="ig-tile-val">
              {formatCompact(insights.profileViews)}
            </span>
            <span className="ig-tile-lbl">{viewsLabel}</span>
          </span>
        </div>
      </div>

      {(insights.gender.length > 0 || insights.ageRanges.length > 0) && (
        <div className="ig-cards">
          {insights.gender.length > 0 && (
            <div className="ig-card">
              <p className="ig-card-title">Gender split</p>
              <GenderDonut buckets={insights.gender} />
            </div>
          )}
          {insights.ageRanges.length > 0 && (
            <div className="ig-card">
              <p className="ig-card-title">Age breakdown</p>
              <AgeBars buckets={insights.ageRanges} />
            </div>
          )}
        </div>
      )}

      {(insights.topCities.length > 0 || insights.topCountries.length > 0) && (
        <div className="ig-cards">
          {insights.topCities.length > 0 && (
            <div className="ig-card">
              <p className="ig-card-title">Top cities</p>
              <RankedList
                buckets={insights.topCities}
                limit={rankLimit}
                kind="city"
              />
            </div>
          )}
          {insights.topCountries.length > 0 && (
            <div className="ig-card">
              <p className="ig-card-title">Top countries</p>
              <RankedList
                buckets={insights.topCountries}
                limit={rankLimit}
                kind="country"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
