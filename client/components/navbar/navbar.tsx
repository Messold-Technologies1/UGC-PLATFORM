"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore} from "react";
import { useTheme } from "next-themes";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import {
  Menu, X, User, Moon, Sun,
  Users, ShoppingCart, Briefcase, UserCheck, Settings, Package, Activity, FileText, ChevronDown, MessageSquare, type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavbarProfileMenu } from "@/components/navbar/navbar-profile-menu";
import { NotificationDropdown } from "@/components/navbar/notification-dropdown";
import { BrandSwitcher } from "@/features/brand/components/brand-switcher";
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
  href?: string;
  label: string;
  icon: LucideIcon;
  match?: (p: string) => boolean;
  children?: {
    href: string;
    label: string;
    icon: LucideIcon;
    description: string;
  }[];
}

const roleConfigs: Record<string, NavItem[]> = {
  brand: [
    { href: "/brand/creators", label: "Creators", icon: Users },
    { href: "/brand/orders", label: "Orders", icon: ShoppingCart },
    { href: "/brand/messages", label: "Messages", icon: MessageSquare },
    { href: "/brand/briefs", label: "Briefs", icon: FileText },
  ],
  creator: [
    {
      label: "Activity",
      icon: Activity,
      children: [
        { href: "/creator/orders", label: "Collaboration", icon: ShoppingCart, description: "Manage your ongoing brand partnerships and orders." },
      ]
    },
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
  if (item.href && pathname === item.href) return true;
  if (item.href && item.href.length > 1 && pathname.startsWith(`${item.href}/`)) return true;
  if (item.children?.some(child => pathname === child.href || (child.href.length > 1 && pathname.startsWith(`${child.href}/`)))) return true;
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
          transition: { type: "spring", stiffness: 260, damping: 20, mass: 1 }
        },
        hidden: { 
          y: "-150%",
          transition: { type: "spring", stiffness: 260, damping: 20, mass: 1 }
        }
      }}
      animate={hidden ? "hidden" : "visible"}
      className="sticky top-4 z-50 mx-auto w-[90%] md:w-[82%] mb-8"
    >
      <div className={cn(
        "flex flex-col overflow-visible border border-border/50 bg-[#f7f7f7cc] shadow-sm backdrop-blur-md backdrop-saturate-125 transition-all duration-300 dark:bg-background/60",
        mobileOpen ? "rounded-2xl" : "rounded-full",
      )}>
        <div className="relative flex h-12 w-full items-center justify-between overflow-visible px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-6 overflow-visible lg:gap-8">
            <Link
              href="/"
              prefetch
              className="z-10 flex shrink-0 items-center overflow-visible py-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static public asset; explicit box avoids Next/Image layout collapse in pill navbar */}
              <img
                src="/brand-logo.png"
                alt={`${SITE_NAME} home`}
                width={688}
                height={160}
                className="h-17.25 max-h-none w-auto max-w-[min(428px,calc(100vw-144px))] object-contain object-left sm:h-21.25 sm:max-w-[min(490px,calc(100vw-208px))] md:h-26 md:max-w-[min(548px,calc(100vw-300px))]"
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </Link>
          </div>
           
          {navItems.length > 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = isNavItemActive(pathname || "", item);
                  
                  if (item.children) {
                    return (
                      <div key={item.label} className="group relative">
                        <button
                          className={cn(
                            "relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors rounded-full font-heading",
                            isActive
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                          <ChevronDown className="size-3 opacity-50 transition-transform group-hover:rotate-180" />
                        </button>
                        
                        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 pointer-events-none opacity-0 translate-y-2 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-50">
                          <div className="w-[960px] max-w-[95vw] rounded-[2rem] bg-[#f7f7f7] shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:bg-slate-950 border border-border/50 overflow-hidden flex p-6 gap-6 items-stretch">
                            
                            {/* Left Section */}
                            <div className="flex-1 flex flex-col justify-start pt-1 pl-2">
                              {/* <div className="text-sm text-muted-foreground mb-4 px-4">By feature</div> */}
                              <div className="grid grid-cols-2 gap-2">
                                {item.children.map((child) => (
                                  <Link key={child.href} href={child.href} className="group/link block p-4 rounded-3xl hover:bg-white dark:hover:bg-white/10 transition-all hover:shadow-sm">
                                    <div className="font-semibold text-foreground mb-1 group-hover/link:text-primary transition-colors">{child.label}</div>
                                    <div className="text-sm text-muted-foreground leading-relaxed">
                                      {child.description}
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>

                            {/* Right Section - Blue Card */}
                            {/* <div className="w-[300px] shrink-0 flex flex-col">
                              <div className="bg-[#c2e2ff] dark:bg-blue-900/40 rounded-3xl p-5 flex flex-col relative overflow-hidden h-full">
                                <div className="relative z-10 mb-3">
                                  <div className="text-sm text-blue-900/80 dark:text-blue-200 mb-0.5">Now Live:</div>
                                  <div className="text-[24px] leading-tight font-medium text-blue-950 dark:text-blue-50 tracking-tight">CreativeOps</div>
                                </div>
                                
                                <div className="flex flex-col gap-2 relative z-10">
                                 
                                  <div className="bg-white/95 dark:bg-slate-800/90 rounded-[16px] p-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                                    <div className="text-[13px] font-semibold text-foreground mb-0.5">Brief</div>
                                    <div className="text-[10px] text-muted-foreground mb-2">New Year, New Me</div>
                                    <div className="h-1 bg-gray-200 dark:bg-slate-700 rounded-full w-full mb-1.5"></div>
                                    <div className="h-1 bg-gray-200 dark:bg-slate-700 rounded-full w-2/3"></div>
                                  </div>
                                  
                                 
                                  <div className="bg-white/95 dark:bg-slate-800/90 rounded-[16px] p-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-center gap-3">
                                    <div className="size-8 bg-blue-50 dark:bg-blue-900/50 rounded-lg shrink-0 flex items-center justify-center">
                                      <Package className="size-4 text-blue-500 dark:text-blue-400" />
                                    </div>
                                    <div>
                                      <div className="text-[13px] font-semibold text-foreground">Product</div>
                                      <div className="text-[10px] text-muted-foreground">Skincare Set</div>
                                    </div>
                                  </div>

                                  
                                  <div className="bg-white/95 dark:bg-slate-800/90 rounded-[16px] p-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className="text-[13px] font-semibold text-foreground">Creators</span>
                                      <span className="text-[8px] bg-[#dcfce7] text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">99% match</span>
                                    </div>
                                    <div className="flex -space-x-1.5">
                                      <div className="size-5 rounded-full bg-slate-200 dark:bg-slate-600 border-2 border-white dark:border-slate-800"></div>
                                      <div className="size-5 rounded-full bg-slate-300 dark:bg-slate-500 border-2 border-white dark:border-slate-800"></div>
                                      <div className="size-5 rounded-full bg-slate-400 dark:bg-slate-400 border-2 border-white dark:border-slate-800"></div>
                                      <div className="size-5 rounded-full bg-[#dcfce7] dark:bg-green-900/50 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px] text-green-700 dark:text-green-400 font-bold z-10">+50</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div> */}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href || item.label}
                      href={item.href || "#"}
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
          {/* <ThemeToggle /> */}
          {isLoading ? (
            <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
          ) : isAuthenticated ? (
            <>
              {(pathname === "/brand" ||
                pathname.startsWith("/brand/")) && (
                <BrandSwitcher />
              )}
              <NotificationDropdown />
              <NavbarProfileMenu />
            </>
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
          {/* <ThemeToggle /> */}
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
                if (item.children) {
                  return (
                    <div key={item.label} className="flex flex-col gap-1">
                      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                        {item.label}
                      </div>
                      {item.children.map(child => {
                        const isChildActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            prefetch
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg pl-6 pr-3 py-2.5 text-sm font-medium font-heading transition-colors",
                              isChildActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <child.icon className="size-4" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href || item.label}
                    href={item.href || "#"}
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
            <div className="flex items-center gap-4 px-3 py-2">
              <NotificationDropdown />
              <NavbarProfileMenu onNavigate={() => setMobileOpen(false)} />
            </div>
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
