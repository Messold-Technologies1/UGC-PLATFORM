"use client";

import type { DashboardEarningsPoint } from "../mock/dashboard-mock-data";

interface Props {
  data: DashboardEarningsPoint[];
  total: number;
  trend: string;
}

export function DashboardEarningsChart({ data, total, trend }: Props) {
  const W = 400;
  const H = 120;
  const PAD = 12;

  const max = Math.max(...data.map((d) => d.value));
  const points = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - PAD - (d.value / max) * (H - PAD * 2),
    ...d,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = [
    `M${points[0].x},${H}`,
    ...points.map((p) => `L${p.x},${p.y}`),
    `L${points[points.length - 1].x},${H}`,
    "Z",
  ].join(" ");

  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground font-medium">Earnings Overview</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(total)}
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-1">
          {trend}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: 100 }}
      >
        <defs>
          <linearGradient id="earn-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.596 0.235 18.49)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="oklch(0.596 0.235 18.49)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#earn-grad)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="oklch(0.596 0.235 18.49)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="oklch(0.596 0.235 18.49)" />
        ))}
      </svg>

      <div className="flex justify-between">
        {data.map((d) => (
          <span key={d.label} className="text-[10px] text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
