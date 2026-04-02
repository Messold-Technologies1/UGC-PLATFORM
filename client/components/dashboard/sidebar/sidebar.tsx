"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Video,
  LayoutDashboard,
  Layers,
  Users,
  Briefcase,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { useWorkspaceNavigation } from "@/features/auth/hooks/use-workspace-navigation";
import { useAuth } from "@/providers/auth-provider";

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
      // { href: "/brand/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/brand/creators", label: "Browse Creators", icon: Users },
    ],
  },
  creator: {
    icon: Video,
    label: "Creator Hub",
    navItems: [
      { href: "/creator/dashboard", label: "Dashboard", icon: LayoutDashboard },
      // { href: "/creator/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/creator/portfolio", label: "Portfolio", icon: Briefcase },
    ],
  },
};

function getRoleFromPath(pathname: string): RoleConfig {
  const segment = pathname.split("/")[1];
  return roleConfigs[segment] ?? roleConfigs.brand;
}


function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href.length > 1 && pathname.startsWith(`${href}/`)) return true;
  return false;
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);
  const { goWorkspace } = useWorkspaceNavigation();
  const { user } = useAuth();
  
  const hasMultipleRoles = user?.roles && user.roles.length > 1;

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

      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent>Open sidebar</TooltipContent>
      </Tooltip>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex min-h-0 w-65 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[transform,width] duration-300 ease-out",
          !mobileOpen && "max-lg:-translate-x-full",
          mobileOpen && "max-lg:translate-x-0",
          "lg:static lg:z-20 lg:h-full lg:translate-x-0",
          desktopCollapsed ? "lg:w-18" : "lg:w-65",
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
            className={cn("min-w-0 flex-1", desktopCollapsed && "lg:hidden")}
          >
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {roleLabel}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Manage everything
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto shrink-0 lg:hidden"
                onClick={closeMobile}
                aria-label="Close sidebar"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close sidebar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hidden shrink-0 lg:flex"
                onClick={() => setDesktopCollapsed((v) => !v)}
                aria-label={
                  desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
              >
                {desktopCollapsed ? (
                  <ChevronRight className="size-4" aria-hidden />
                ) : (
                  <ChevronLeft className="size-4" aria-hidden />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
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
            const isActive = isNavItemActive(pathname, href);
            const navLink = (
              <Link
                key={href}
                href={href}
                prefetch
                onClick={closeMobile}
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
                <span className={cn(desktopCollapsed && "lg:sr-only")}>
                  {label}
                </span>
              </Link>
            );

            if (desktopCollapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }

            return navLink;
          })}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-sidebar-border p-3">
          {hasMultipleRoles ? (
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
                    {desktopCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => void goWorkspace("BRAND")}
                            className={cn(
                              "flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                              desktopCollapsed
                                ? "gap-0 px-2 max-lg:gap-3 max-lg:px-3 lg:justify-center"
                                : "gap-3 px-3",
                            )}
                          >
                            <Building2 className="size-4 shrink-0" />
                            <span
                              className={cn(desktopCollapsed && "lg:sr-only")}
                            >
                              Brand hub
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Brand hub</TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                      type="button"
                      onClick={() => void goWorkspace("BRAND")}
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
                    )}
                    {desktopCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => void goWorkspace("CREATOR")}
                            className={cn(
                              "flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                              desktopCollapsed
                                ? "gap-0 px-2 max-lg:gap-3 max-lg:px-3 lg:justify-center"
                                : "gap-3 px-3",
                            )}
                          >
                            <Video className="size-4 shrink-0" />
                            <span
                              className={cn(desktopCollapsed && "lg:sr-only")}
                            >
                              Creator hub
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Creator hub</TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                      type="button"
                      onClick={() => void goWorkspace("CREATOR")}
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
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}

          <div
            className="mx-3 my-2 h-px shrink-0 bg-sidebar-border"
            role="separator"
            aria-hidden
          />

          <SidebarUserMenu
            desktopCollapsed={desktopCollapsed}
            onNavigate={closeMobile}
          />
        </div>
      </aside>
    </>
  );
}
