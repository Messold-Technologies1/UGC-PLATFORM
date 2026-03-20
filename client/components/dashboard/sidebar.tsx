"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeft, LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  navItems: NavItem[];
  role: "creator" | "brand";
  roleIcon: LucideIcon;
}

export function DashboardSidebar({ navItems, role, roleIcon: RoleIcon }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
          !collapsed ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setCollapsed(true)}
      />

      <Button
        variant="outline"
        size="icon-sm"
        className="fixed left-3 top-3.5 z-50 shadow-sm lg:hidden"
        onClick={() => setCollapsed((v) => !v)}
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="size-4" />
      </Button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out lg:static lg:z-auto lg:translate-x-0",
          collapsed ? "-translate-x-full" : "translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="bg-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            <RoleIcon className="size-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium capitalize text-sidebar-foreground">
              {role} Hub
            </p>
            <p className="truncate text-xs text-muted-foreground">Manage everything</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto shrink-0 lg:hidden"
            onClick={() => setCollapsed(true)}
            aria-label="Close sidebar"
          >
            <PanelLeft className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
            Menu
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setCollapsed(true)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-foreground text-background shadow-md shadow-foreground/10"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4 shrink-0" />
            Back to Home
          </Link>
        </div>
      </aside>
    </>
  );
}
