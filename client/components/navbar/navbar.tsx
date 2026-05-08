"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import {
  Menu, X, User, Moon, Sun,
  Users, ShoppingCart, Briefcase, UserCheck, Settings, Package, type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavbarProfileMenu } from "@/components/navbar/navbar-profile-menu";
import { useAuth } from "@/providers/auth-provider";
import { SITE_NAME } from "@/config/site";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle theme"
        className="relative overflow-hidden"
        disabled
      >
        <Sun className="absolute size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const tooltipLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
          className="relative overflow-hidden"
        >
          <Sun
            className={cn(
              "absolute size-4 transition-all duration-300",
              isDark
                ? "rotate-90 scale-0 opacity-0"
                : "rotate-0 scale-100 opacity-100",
            )}
          />
          <Moon
            className={cn(
              "absolute size-4 transition-all duration-300",
              isDark
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-0 opacity-0",
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (p: string) => boolean;
}

const roleConfigs: Record<string, NavItem[]> = {
  brand: [
    { href: "/brand/creators", label: "Browse Creators", icon: Users },
    { href: "/brand/orders", label: "Orders", icon: ShoppingCart },
  ],
  creator: [
    { href: "/creator/orders", label: "Orders", icon: ShoppingCart },
    { href: "/creator/portfolio", label: "Portfolio", icon: Briefcase },
  ],
  admin: [
    { href: "/admin/approvals", label: "Creator Approval", icon: UserCheck, match: (p) => p.includes("/approvals") },
    { href: "/admin/brandManagement", label: "Brand Management", icon: Users, match: (p) => p.includes("/brandManagement") },
    { href: "/admin/orderManagement", label: "Order Management", icon: Package, match: (p) => p.includes("/orderManagement") },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

function getNavItems(pathname: string): NavItem[] {
  const segment = pathname.split("/")[1];
  return roleConfigs[segment] ?? [];
}

function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.match) return item.match(pathname);
  if (pathname === item.href) return true;
  if (item.href.length > 1 && pathname.startsWith(`${item.href}/`)) return true;
  return false;
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  const navItems = getNavItems(pathname || "");

  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    
    if (mobileOpen) return;

    if (latest > 100 && latest > previous) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  return (
    <motion.header
      variants={{
        visible: { 
          y: 0,
          transition: { type: "spring", stiffness: 260, damping: 20, mass: 1, delay: 0.45 }
        },
        hidden: { 
          y: "-150%",
          transition: { type: "spring", stiffness: 260, damping: 20, mass: 1, delay: 0.15 }
        }
      }}
      animate={hidden ? "hidden" : "visible"}
      className="sticky top-6 z-50 mx-auto w-[90%] md:w-[82%] mb-8"
    >
      <div className={cn(
        "flex flex-col border border-border/50 bg-[#f7f7f7cc] dark:bg-background/60 shadow-sm backdrop-blur-md backdrop-saturate-125 transition-all duration-300",
        mobileOpen ? "rounded-2xl" : "rounded-full"
      )}>
        <div className="relative flex h-12 w-full items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6 lg:gap-8">
            <Link href="/" prefetch className="flex items-center gap-2 shrink-0">
              <span className="text-lg font-bold font-heading tracking-tight">{SITE_NAME}</span>
            </Link>
          </div>
           
          {navItems.length > 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = isNavItemActive(pathname || "", item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      className={cn(
                        "relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors rounded-full font-heading",
                        isActive
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        <div className="hidden items-center gap-2 md:flex shrink-0">
          <ThemeToggle />
          {isLoading ? (
            <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
          ) : isAuthenticated ? (
            <NavbarProfileMenu />
          ) : (
            <>
              <Button asChild variant="outline" size="sm" className="font-heading">
                <Link href="/login" prefetch>
                  Log in
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-foreground border-0 text-background hover:opacity-90 font-heading"
              >
                <Link href="/signup" prefetch>
                  Get Started
                </Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
              >
                {mobileOpen ? (
                  <X className="size-5" />
                ) : (
                  <Menu className="size-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{mobileOpen ? "Close menu" : "Open menu"}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div
        id="mobile-nav"
        role="navigation"
        aria-label="Mobile navigation"
        className={cn(
          "overflow-hidden border-t border-border/60 transition-all duration-200 md:hidden",
          mobileOpen
            ? "max-h-[min(100dvh-5.25rem,28rem)] overflow-y-auto"
            : "max-h-0 border-t-0",
        )}
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {navItems.length > 0 && (
            <>
              {navItems.map((item) => {
                const isActive = isNavItemActive(pathname || "", item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium font-heading transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="my-2 h-px bg-border/60" />
            </>
          )}

          {isAuthenticated ? (
            <NavbarProfileMenu onNavigate={() => setMobileOpen(false)} />
          ) : (
            <>
              <Link
                href="/login"
                prefetch
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium font-heading text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                prefetch
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium font-heading text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                <User className="size-4" />
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
      </div>
    </motion.header>
  );
}
