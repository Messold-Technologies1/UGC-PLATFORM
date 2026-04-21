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
  ShoppingCart,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
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
      { href: "/brand/orders", label: "Orders", icon: ShoppingCart },
    ],
  },
  creator: {
    icon: Video,
    label: "Creator Hub",
    navItems: [
      { href: "/creator/dashboard", label: "Dashboard", icon: LayoutDashboard },
      // { href: "/creator/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/creator/orders", label: "Orders", icon: ShoppingCart },
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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const { goWorkspace, switchingWorkspaceRole } = useWorkspaceNavigation();
  const { user } = useAuth();
  const switchingToBrand = switchingWorkspaceRole === "BRAND";
  const switchingToCreator = switchingWorkspaceRole === "CREATOR";

  const hasMultipleRoles = user?.roles && user.roles.length > 1;

  const {
    navItems,
    icon: RoleIcon,
    label: roleLabel,
  } = getRoleFromPath(pathname);

  const closeMobile = () => setMobileOpen(false);

  const navItemClass = (isActive: boolean) =>
    cn(
      "relative group flex items-center border-l-[3px] border-transparent py-3 text-sm font-heading transition-colors duration-300",
      desktopCollapsed
        ? "px-2 lg:justify-center max-lg:gap-3 max-lg:px-6"
        : "gap-3 px-6",
      isActive
        ? "font-semibold text-primary"
        : "text-muted-foreground hover:bg-linear-to-r hover:from-primary/10 hover:to-transparent hover:text-foreground",
    );

  const utilityItemClass = cn(
    "flex items-center border-l-[3px] py-3 text-sm font-heading transition-all duration-300",
    desktopCollapsed
      ? "px-2 lg:justify-center max-lg:gap-3 max-lg:px-6"
      : "gap-3 px-6",
    "border-transparent text-muted-foreground hover:bg-linear-to-r hover:from-primary/10 hover:to-transparent hover:text-foreground",
  );

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
          "fixed inset-y-0 left-0 z-50 flex min-h-0 w-64 shrink-0 flex-col bg-background transition-[transform,width] duration-300 ease-out",
          !mobileOpen && "max-lg:-translate-x-full",
          mobileOpen && "max-lg:translate-x-0",
          "lg:static lg:z-20 lg:h-full lg:translate-x-0",
          desktopCollapsed ? "lg:w-18" : "lg:w-64",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center gap-3 px-6 pb-8 pt-8",
            desktopCollapsed &&
              "lg:min-h-16 lg:flex-col lg:justify-center lg:gap-2 lg:px-2 lg:pb-4 lg:pt-6",
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/12 to-secondary/12 text-primary">
            <RoleIcon className="size-4" aria-hidden />
          </div>
          <div
            className={cn("min-w-0 flex-1", desktopCollapsed && "lg:hidden")}
          >
            <p className="truncate bg-linear-to-r from-primary to-secondary bg-clip-text text-xl font-bold text-transparent">
              COLLABRY
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {roleLabel}
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

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto py-1">
          <div
            className={cn(
              "mx-6 mb-4 h-px bg-border/40",
              desktopCollapsed && "lg:mx-3",
            )}
            aria-hidden
          />
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = isNavItemActive(pathname, href);
            const navLink = (
              <Link
                key={href}
                href={href}
                prefetch
                onClick={closeMobile}
                className={navItemClass(isActive)}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveIndicator"
                    className="absolute inset-y-0 -left-[3px] right-0 border-l-[3px] border-primary bg-linear-to-r from-primary/10 to-transparent pointer-events-none"
                    initial={false}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 size-4 shrink-0" />
                <span
                  className={cn(
                    "relative z-10",
                    desktopCollapsed && "lg:sr-only",
                  )}
                >
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

        <div className="shrink-0 space-y-1 border-t border-border/30 px-0 pb-3 pt-3">
          {hasMultipleRoles ? (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="workspace" className="border-0">
                <AccordionTrigger
                  className={cn(
                    "border-l-[3px] py-3 text-muted-foreground transition-all duration-300 hover:bg-linear-to-r hover:from-primary/10 hover:to-transparent hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background",
                    desktopCollapsed
                      ? "border-transparent px-2 max-lg:gap-2 max-lg:px-6 lg:justify-center"
                      : "gap-3 border-transparent px-6",
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
                            disabled={switchingToBrand}
                            onClick={() => void goWorkspace("BRAND")}
                            className={cn(utilityItemClass, "w-full")}
                          >
                            {switchingToBrand ? (
                              <LoaderCircle className="size-4 shrink-0 animate-spin" />
                            ) : (
                              <Building2 className="size-4 shrink-0" />
                            )}
                            <span
                              className={cn(desktopCollapsed && "lg:sr-only")}
                            >
                              {switchingToBrand ? "Switching to Brand…" : "Brand hub"}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Brand hub</TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        type="button"
                        disabled={switchingToBrand}
                        onClick={() => void goWorkspace("BRAND")}
                        className={cn(utilityItemClass, "w-full")}
                      >
                        {switchingToBrand ? (
                          <LoaderCircle className="size-4 shrink-0 animate-spin" />
                        ) : (
                          <Building2 className="size-4 shrink-0" />
                        )}
                        <span className={cn(desktopCollapsed && "lg:sr-only")}>
                          {switchingToBrand ? "Switching to Brand…" : "Brand hub"}
                        </span>
                      </button>
                    )}
                    {desktopCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            disabled={switchingToCreator}
                            onClick={() => void goWorkspace("CREATOR")}
                            className={cn(utilityItemClass, "w-full")}
                          >
                            {switchingToCreator ? (
                              <LoaderCircle className="size-4 shrink-0 animate-spin" />
                            ) : (
                              <Video className="size-4 shrink-0" />
                            )}
                            <span
                              className={cn(desktopCollapsed && "lg:sr-only")}
                            >
                              {switchingToCreator ? "Switching to Creator…" : "Creator hub"}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          Creator hub
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        type="button"
                        disabled={switchingToCreator}
                        onClick={() => void goWorkspace("CREATOR")}
                        className={cn(utilityItemClass, "w-full")}
                      >
                        {switchingToCreator ? (
                          <LoaderCircle className="size-4 shrink-0 animate-spin" />
                        ) : (
                          <Video className="size-4 shrink-0" />
                        )}
                        <span className={cn(desktopCollapsed && "lg:sr-only")}>
                          {switchingToCreator ? "Switching to Creator…" : "Creator hub"}
                        </span>
                      </button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}

          <div
            className="mx-6 my-2 h-px shrink-0 bg-border/40"
            role="separator"
            aria-hidden
          />

          <div className="px-3">
            <SidebarUserMenu
              desktopCollapsed={desktopCollapsed}
              onNavigate={closeMobile}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
