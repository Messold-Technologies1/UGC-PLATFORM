"use client";

import { Wifi } from "lucide-react";
import { useCreatorDashboardQuery } from "../hooks/use-creator-dashboard-query";
import { DashboardStatCards } from "./dashboard-stat-cards";
import { DashboardOrdersTable } from "./dashboard-orders-table";
import { DashboardUpcomingDeliveries } from "./dashboard-upcoming-deliveries";
import { DashboardEarningsChart } from "./dashboard-earnings-chart";
import { DashboardRightPanel } from "./dashboard-right-panel";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export function CreatorDashboard() {
  const { data, isLoading } = useCreatorDashboardQuery();

  if (isLoading || !data) {
    return (
      <div className="p-6 flex flex-col gap-5">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-[1fr_320px] gap-5">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <div className="flex flex-col gap-5">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div
        data-tour="creator-dashboard-header"
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold">
              <Wifi className="size-3" />
              Available for Work
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Good morning, {data.creator.name} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here&apos;s what&apos;s happening with your collaborations today.
          </p>
        </div>
        <a
          href="/creator/portfolio"
          className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors"
        >
          View Portfolio →
        </a>
      </div>

      {/* Stat cards */}
      <DashboardStatCards stats={data.stats} />

      {/* Main grid: 2-col layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <DashboardOrdersTable orders={data.activeOrders} />
          <DashboardUpcomingDeliveries deliveries={data.upcomingDeliveries} />
          <DashboardEarningsChart
            data={data.earnings.chartData}
            total={data.earnings.total}
            trend={data.earnings.trend}
          />
        </div>

        {/* Right column */}
        <DashboardRightPanel
          creator={data.creator}
          messages={data.messages}
          tasks={data.tasks}
        />
      </div>
    </div>
  );
}
