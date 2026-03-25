import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import {
  Video,
  Eye,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Megaphone,
} from "lucide-react";

export const metadata: Metadata = { title: "Creator Dashboard" };

const stats = [
  { label: "Total Videos", value: "0", icon: Video, trend: undefined },
  { label: "Total Views", value: "0", icon: Eye, trend: undefined },
  { label: "Earnings", value: "$0.00", icon: DollarSign, trend: undefined },
  { label: "Active Campaigns", value: "0", icon: TrendingUp, trend: undefined },
];

export default function CreatorDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome back"
        description="Here's an overview of your creator activity"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/5" />
          <div className="relative">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Megaphone className="size-5 text-primary" />
            </div>
            <h2 className="text-lg font-medium">Browse Campaigns</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Discover brand campaigns looking for creators like you.
            </p>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mt-4 gap-1.5 px-0 text-primary hover:text-primary/80"
            >
              <Link href="/creator/campaigns">
                Explore campaigns
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-muted" />
          <div className="relative">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-foreground/10">
              <Video className="size-5 text-foreground" />
            </div>
            <h2 className="text-lg font-medium">Build Your Portfolio</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your best content to stand out and attract top brands.
            </p>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mt-4 gap-1.5 px-0 text-primary hover:text-primary/80"
            >
              <Link href="/creator/portfolio">
                Add content
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Recent Activity</h2>
        <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
            <TrendingUp className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No activity yet
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">
            Your recent campaign applications, submissions, and earnings will
            appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
