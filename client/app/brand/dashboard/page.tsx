import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Users,
  DollarSign,
  BarChart3,
  ArrowRight,
  Plus,
} from "lucide-react";

const stats = [
  { label: "Active Campaigns", value: "0", icon: Megaphone, trend: undefined },
  { label: "Hired Creators", value: "0", icon: Users, trend: undefined },
  { label: "Total Spent", value: "$0.00", icon: DollarSign, trend: undefined },
  { label: "Avg. Engagement", value: "0%", icon: BarChart3, trend: undefined },
];

export default function BrandDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome back"
        description="Here's an overview of your brand activity"
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
              <Plus className="size-5 text-primary" />
            </div>
            <h2 className="text-lg font-medium">Create a Campaign</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Launch a new UGC campaign and start receiving creator submissions.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 gap-1.5 px-0 text-primary hover:text-primary/80"
            >
              Get started
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-muted" />
          <div className="relative">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-foreground/10">
              <Users className="size-5 text-foreground" />
            </div>
            <h2 className="text-lg font-medium">Find Creators</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse our talent pool and find the perfect creators for your
              brand.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 gap-1.5 px-0 text-primary hover:text-primary/80"
            >
              Browse creators
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Recent Activity</h2>
        <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
            <BarChart3 className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No activity yet
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">
            Campaign updates, creator applications, and content submissions will
            appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
