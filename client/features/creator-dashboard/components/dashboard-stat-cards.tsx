"use client";

import { Clock, Package, RefreshCw, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStatCard } from "../mock/dashboard-mock-data";

const ICONS = {
  clock: Clock,
  package: Package,
  refresh: RefreshCw,
  wallet: Wallet,
};

interface Props {
  stats: DashboardStatCard[];
}

export function DashboardStatCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = ICONS[stat.icon];
        return (
          <div
            key={stat.label}
            className="flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </span>
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="size-4 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p
                className={cn(
                  "text-xs mt-0.5",
                  stat.trend
                    ? stat.trend.positive
                      ? "text-emerald-600"
                      : "text-red-500"
                    : "text-muted-foreground"
                )}
              >
                {stat.trend ? stat.trend.value : stat.subLabel}
              </p>
              {stat.trend && (
                <p className="text-xs text-muted-foreground">{stat.subLabel}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
