"use client";

import {
  Briefcase,
  Building2,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WorkspaceBackdropRole = "brand" | "creator";

type WorkspaceBackdropConfig = {
  icon: LucideIcon;
  label: string;
  accentClassName: string;
  haloClassName: string;
  navItems: Array<{
    href: string;
    label: string;
    icon: LucideIcon;
  }>;
};

const roleConfig: Record<WorkspaceBackdropRole, WorkspaceBackdropConfig> = {
  brand: {
    icon: Building2,
    label: "Brand Hub",
    accentClassName: "from-emerald-600/16 to-cyan-500/10",
    haloClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.1),transparent_30%)]",
    navItems: [
      { href: "/brand/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/brand/creators", label: "Browse Creators", icon: Users },
      { href: "/brand/orders", label: "Orders", icon: ShoppingCart },
    ],
  },
  creator: {
    icon: Video,
    label: "Creator Hub",
    accentClassName: "from-[#7a2a3a]/18 to-amber-500/8",
    haloClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(122,42,58,0.18),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.08),transparent_30%)]",
    navItems: [
      { href: "/creator/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/creator/portfolio", label: "Portfolio", icon: Briefcase },
      { href: "/creator/campaigns", label: "Campaigns", icon: Video },
    ],
  },
};

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-background/85 shadow-sm backdrop-blur-sm",
        className,
      )}
    />
  );
}

export function WorkspaceDashboardBackdrop({
  role,
}: {
  role: WorkspaceBackdropRole;
}) {
  const config = roleConfig[role];
  const RoleIcon = config.icon;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 flex min-h-0 overflow-hidden bg-[#f9fafb] text-foreground dark:bg-background"
    >
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/40 bg-background/92 backdrop-blur-sm lg:flex">
        <div className="flex items-center gap-3 px-6 pb-8 pt-8">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-primary",
              config.accentClassName,
            )}
          >
            <RoleIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate bg-linear-to-r from-primary to-secondary bg-clip-text text-xl font-bold text-transparent">
              COLLABRY
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {config.label}
            </p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-hidden py-1">
          <div className="mx-6 mb-4 h-px bg-border/40" />
          {config.navItems.map(({ href, label, icon: Icon }, index) => {
            const active = index === 0;
            return (
              <div
                key={href}
                className={cn(
                  "relative flex items-center gap-3 border-l-[3px] px-6 py-3 text-sm",
                  active
                    ? "border-primary bg-linear-to-r from-primary/10 to-transparent font-semibold text-primary"
                    : "border-transparent text-muted-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border/30 px-3 pb-4 pt-3">
          <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full border border-border/60 bg-muted/70" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-24 rounded-full bg-muted/80" />
                <div className="h-2.5 w-16 rounded-full bg-muted/60" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f9fafb] dark:bg-background">
        <div className={cn("absolute inset-0", config.haloClassName)} />

        <div className="relative flex items-center gap-3 border-b border-border/40 bg-background/70 px-4 py-4 backdrop-blur-sm lg:hidden">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-primary",
              config.accentClassName,
            )}
          >
            <RoleIcon className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">COLLABRY</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {config.label}
            </p>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CardSkeleton className="h-32" />
            <CardSkeleton className="h-32" />
            <CardSkeleton className="hidden h-32 xl:block" />
          </div>

          <div className="mt-6 grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
            <CardSkeleton className="min-h-[22rem]" />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
              <CardSkeleton className="h-44" />
              <CardSkeleton className="h-44" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
