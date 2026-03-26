"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Building2,
  Video,
  LayoutDashboard,
  Layers,
  Megaphone,
  Users,
  Briefcase,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useWorkspaceNavigation } from "@/features/auth/hooks/use-workspace-navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface RoleConfig {
  navItems: NavItem[];
  icon: LucideIcon;
  label: string;
}

const roleConfigs: Record<string, RoleConfig> = {
  brand: {
    icon: Building2,
    label: "Brand Hub",
    navItems: [
      { href: "/brand/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/brand/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/brand/creators", label: "Browse Creators", icon: Users },
      { href: "/brand/settings", label: "Settings", icon: Settings },
    ],
  },
  creator: {
    icon: Video,
    label: "Creator Hub",
    navItems: [
      { href: "/creator/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/creator/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/creator/portfolio", label: "Portfolio", icon: Briefcase },
      { href: "/creator/settings", label: "Settings", icon: Settings },
    ],
  },
};

function getRoleFromPath(pathname: string): RoleConfig {
  const segment = pathname.split("/")[1];
  return roleConfigs[segment] ?? roleConfigs.brand;
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const themeReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { goWorkspace } = useWorkspaceNavigation();
  const isDark = themeReady && resolvedTheme === "dark";
  const {
    navItems,
    icon: RoleIcon,
    label: roleLabel,
  } = getRoleFromPath(pathname);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobile}
        aria-hidden={!mobileOpen}
      />

      <Button
        variant="outline"
        size="icon-sm"
        className={cn(
          "fixed left-3 top-3.5 z-50 shadow-sm lg:hidden",
          mobileOpen && "hidden",
        )}
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex min-h-0 w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[transform,width] duration-300 ease-out",
          !mobileOpen && "max-lg:-translate-x-full",
          mobileOpen && "max-lg:translate-x-0",
          "lg:static lg:z-auto lg:h-full lg:translate-x-0",
          desktopCollapsed ? "lg:w-[72px]" : "lg:w-[260px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5",
            desktopCollapsed &&
              "lg:h-auto lg:min-h-16 lg:flex-col lg:justify-center lg:gap-2 lg:px-2 lg:py-3",
          )}
        >
          <div className="bg-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            <RoleIcon className="size-4 text-background" aria-hidden />
          </div>
          <div
            className={cn(
              "min-w-0 flex-1",
              desktopCollapsed && "lg:hidden",
            )}
          >
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {roleLabel}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Manage everything
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto shrink-0 lg:hidden"
            onClick={closeMobile}
            aria-label="Close sidebar"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden shrink-0 lg:flex"
            onClick={() => setDesktopCollapsed((v) => !v)}
            aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {desktopCollapsed ? (
              <ChevronRight className="size-4" aria-hidden />
            ) : (
              <ChevronLeft className="size-4" aria-hidden />
            )}
          </Button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p
            className={cn(
              "mb-2 px-3 text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground",
              desktopCollapsed && "lg:sr-only",
            )}
          >
            Menu
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                title={label}
                className={cn(
                  "group flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-150",
                  desktopCollapsed
                    ? "gap-0 px-2 max-lg:gap-3 max-lg:px-3 lg:justify-center"
                    : "gap-3 px-3",
                  isActive
                    ? "bg-foreground text-background shadow-md shadow-foreground/10"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span
                  className={cn(desktopCollapsed && "lg:sr-only")}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-sidebar-border p-3">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="workspace" className="border-0">
              <AccordionTrigger
                className={cn(
                  "rounded-xl py-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar",
                  desktopCollapsed
                    ? "gap-0 px-2 max-lg:gap-2 max-lg:px-3 lg:justify-center"
                    : "gap-3 px-3",
                )}
              >
                <Layers
                  className={cn(
                    "size-4 shrink-0",
                    desktopCollapsed ? "hidden lg:inline" : "hidden",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "flex-1 text-left text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground",
                    desktopCollapsed && "lg:sr-only",
                  )}
                >
                  Workspace
                </span>
                <ChevronDown
                  className={cn(
                    "chevron size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    desktopCollapsed && "max-lg:inline lg:hidden",
                  )}
                  aria-hidden
                />
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => void goWorkspace("BRAND")}
                    title="Brand hub"
                    className={cn(
                      "flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      desktopCollapsed
                        ? "gap-0 px-2 max-lg:gap-3 max-lg:px-3 lg:justify-center"
                        : "gap-3 px-3",
                    )}
                  >
                    <Building2 className="size-4 shrink-0" />
                    <span className={cn(desktopCollapsed && "lg:sr-only")}>
                      Brand hub
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void goWorkspace("CREATOR")}
                    title="Creator hub"
                    className={cn(
                      "flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      desktopCollapsed
                        ? "gap-0 px-2 max-lg:gap-3 max-lg:px-3 lg:justify-center"
                        : "gap-3 px-3",
                    )}
                  >
                    <Video className="size-4 shrink-0" />
                    <span className={cn(desktopCollapsed && "lg:sr-only")}>
                      Creator hub
                    </span>
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div
            className="mx-3 my-2 h-px shrink-0 bg-sidebar-border"
            role="separator"
            aria-hidden
          />

          <button
            type="button"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
              "flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              desktopCollapsed
                ? "gap-0 px-2 max-lg:gap-3 max-lg:px-3 lg:justify-center"
                : "gap-3 px-3",
            )}
          >
            {!themeReady ? (
              <Sun className="size-4 shrink-0 opacity-50" aria-hidden />
            ) : (
              <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
                <Sun
                  className={cn(
                    "size-4 transition-all duration-300 ease-out",
                    isDark
                      ? "absolute scale-0 rotate-90 opacity-0"
                      : "scale-100 rotate-0 opacity-100",
                  )}
                  aria-hidden
                />
                <Moon
                  className={cn(
                    "size-4 transition-all duration-300 ease-out",
                    isDark
                      ? "scale-100 rotate-0 opacity-100"
                      : "absolute scale-0 -rotate-90 opacity-0",
                  )}
                  aria-hidden
                />
              </span>
            )}
            <span className={cn(desktopCollapsed && "lg:sr-only")}>
              {!themeReady ? "Theme" : isDark ? "Light mode" : "Dark mode"}
            </span>
          </button>
          <Link
            href="/"
            title="Back to Home"
            className={cn(
              "flex items-center rounded-xl py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              desktopCollapsed
                ? "gap-0 px-2 max-lg:gap-3 max-lg:px-3 lg:justify-center"
                : "gap-3 px-3",
            )}
          >
            <LogOut className="size-4 shrink-0" />
            <span className={cn(desktopCollapsed && "lg:sr-only")}>
              Back to Home
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
