"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  adminNavGroupsFor,
  isAdminNavItemActive,
} from "@/components/admin/admin-nav-items";

/**
 * Admin's primary navigation.
 *
 * Desktop only. Eleven destinations did not fit the navbar pill — at common
 * laptop widths "Settings" ran under the notification bell — and the labels
 * had been squeezed to `text-xs` to buy room, smaller than anywhere else in
 * the product. A vertical rail has room for full labels at a readable size,
 * and room to group them.
 *
 * Below `lg` this renders nothing: the navbar's existing mobile menu lists the
 * same items, from the same source, so small screens keep one hamburger
 * instead of gaining a second trigger beside the logo.
 */
export function AdminSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname() || "";
  const { user } = useAuth();
  const groups = adminNavGroupsFor(Boolean(user?.canManageAdmins));

  return (
    <aside
      aria-label="Admin navigation"
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden shrink-0 flex-col border-r border-border/60 bg-[#f7f7f7] transition-[width] duration-200 lg:flex dark:bg-background/80",
        collapsed ? "w-[4.5rem]" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-[4.5rem] shrink-0 items-center",
          collapsed ? "justify-center px-2" : "justify-between pl-4 pr-2",
        )}
      >
        {!collapsed && (
          // Deliberately NOT the logo: the navbar above already shows it, and
          // two GoCollab marks in one viewport read as a rendering bug. A
          // label earns its space by saying which workspace this rail is for.
          <span className="truncate pl-1 font-heading text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
            Admin
          </span>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4.5" />
              ) : (
                <PanelLeftClose className="size-4.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav
        className={cn(
          "flex-1 overflow-y-auto pb-6",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            {collapsed ? (
              // Keeps the visual rhythm of the groups without a label that
              // would not fit. Not announced: the links themselves still read
              // correctly to a screen reader.
              <div aria-hidden className="mx-auto mb-2 h-px w-6 bg-border/70" />
            ) : (
              <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isAdminNavItemActive(pathname, item.href);
                const link = (
                  <Link
                    href={item.href}
                    prefetch
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center rounded-lg text-sm font-medium font-heading transition-colors",
                      collapsed
                        ? "justify-center px-2 py-2.5"
                        : "gap-2.5 px-3 py-2",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );

                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
