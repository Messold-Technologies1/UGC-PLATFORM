"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTheme } from "next-themes";
import {
  Bell,
  Loader2,
  LogOut,
  Moon,
  Shield,
  Sun,
  UserRound,
} from "lucide-react";
import {
  accountMenuGlassPanel,
  accountMenuItemClass,
  accountMenuItemLogoutClass,
} from "@/components/account-menu-styles";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

function useThemeMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function displayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email.split("@")[0] || "Account";
}

function initials(user: { name: string | null; email: string }) {
  const base = user.name?.trim() || user.email.split("@")[0] || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase().slice(0, 2);
  }
  return base.slice(0, 2).toUpperCase();
}

export function SidebarUserMenu({
  desktopCollapsed,
  onNavigate,
}: {
  desktopCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout, isLoggingOut, isLoading } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const themeMounted = useThemeMounted();
  const isDark = themeMounted && resolvedTheme === "dark";
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const hub = pathname.startsWith("/brand") ? "brand" : "creator";
  const settingsHref =
    hub === "brand" ? "/brand/account" : "/creator/settings";
  const accountHref = `/${hub}/account`;

  const isAccountSectionActive =
    pathname === accountHref || pathname.startsWith(`${accountHref}/`);
  const isSettingsSectionActive =
    pathname === settingsHref || pathname.startsWith(`${settingsHref}/`);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    onNavigate?.();
  }, [onNavigate]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMobileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  const themeToggle = () => setTheme(isDark ? "light" : "dark");

  const triggerClick = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) return;
    setMobileOpen((v) => !v);
  };

  if (isLoading && !user) {
    return (
      <div
        className={cn(
          "pointer-events-none flex w-full items-center gap-3 rounded-xl px-2 py-2",
          desktopCollapsed && "lg:justify-center lg:px-1",
        )}
        aria-busy="true"
        aria-label="Loading account"
      >
        <Skeleton className="size-9 shrink-0 rounded-full border border-border/40" />
        <div className={cn("min-w-0 flex-1", desktopCollapsed && "lg:hidden")}>
          <Skeleton className="h-4 w-30 max-w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const name = displayName(user);
  const label = `Account menu (${name})`;

  const panelVisibleMobile = mobileOpen;

  return (
    <div ref={wrapRef} className="group relative">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none transition-colors",
          "hover:bg-sidebar-accent/80",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          desktopCollapsed && "lg:justify-center lg:px-1",
        )}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={panelVisibleMobile}
        onClick={triggerClick}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            "border border-border/60 bg-background/50 backdrop-blur-md backdrop-saturate-125",
            "text-muted-foreground transition-colors group-hover:text-primary",
            desktopCollapsed && "lg:size-9",
          )}
          aria-hidden
        >
          {initials(user)}
        </span>
        <div className={cn("min-w-0 flex-1", desktopCollapsed && "lg:hidden")}>
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {name}
          </p>
        </div>
      </button>

      {/* Same interaction model as navbar profile: hover + focus-within on lg; tap on small screens */}
      <div
        className={cn(
          "absolute z-50 transition-[opacity,visibility] duration-150",
          "max-lg:left-0 max-lg:right-0 max-lg:bottom-full max-lg:pb-2",
          "lg:left-full lg:bottom-0 lg:ml-2 lg:pb-0 lg:pt-0",
          "invisible opacity-0",
          panelVisibleMobile && "max-lg:visible max-lg:opacity-100",
          "lg:group-hover:visible lg:group-hover:opacity-100",
          "lg:group-focus-within:visible lg:group-focus-within:opacity-100",
        )}
        role="menu"
        aria-label="Account actions"
      >
        <div className={cn("min-w-52 rounded-xl p-1", accountMenuGlassPanel)}>
          <button
            type="button"
            role="menuitem"
            className={cn(accountMenuItemClass, "w-full text-left")}
            onClick={() => themeToggle()}
          >
            {!themeMounted ? (
              <Sun className="size-4 opacity-60" aria-hidden />
            ) : (
              <span className="relative inline-flex size-4 items-center justify-center">
                <Sun
                  className={cn(
                    "size-4 transition-all duration-200",
                    isDark
                      ? "absolute scale-0 rotate-90 opacity-0"
                      : "scale-100 rotate-0 opacity-100",
                  )}
                  aria-hidden
                />
                <Moon
                  className={cn(
                    "size-4 transition-all duration-200",
                    isDark
                      ? "scale-100 rotate-0 opacity-100"
                      : "absolute scale-0 -rotate-90 opacity-0",
                  )}
                  aria-hidden
                />
              </span>
            )}
            {!themeMounted ? "Theme" : isDark ? "Light mode" : "Dark mode"}
          </button>
          <Link
            href={settingsHref}
            role="menuitem"
            className={cn(
              accountMenuItemClass,
              "w-full",
              isSettingsSectionActive && "bg-accent/80 text-accent-foreground",
            )}
            onClick={closeMobile}
          >
            <Bell className="size-4" aria-hidden />
            Notifications
          </Link>
          <Link
            href={settingsHref}
            role="menuitem"
            className={cn(
              accountMenuItemClass,
              "w-full",
              isSettingsSectionActive && "bg-accent/80 text-accent-foreground",
            )}
            onClick={closeMobile}
          >
            <Shield className="size-4" aria-hidden />
            Security
          </Link>
          <Link
            href={accountHref}
            role="menuitem"
            className={cn(
              accountMenuItemClass,
              "w-full",
              isAccountSectionActive && "bg-accent/80 text-accent-foreground",
            )}
            onClick={closeMobile}
          >
            <UserRound className="size-4" aria-hidden />
            Profile
          </Link>
          <div
            className="my-1 h-px bg-border/60"
            role="separator"
            aria-hidden
          />
          <button
            type="button"
            role="menuitem"
            disabled={isLoggingOut}
            onClick={() => {
              closeMobile();
              void logout();
            }}
            className={cn(
              accountMenuItemLogoutClass,
              "w-full text-left",
              isLoggingOut && "pointer-events-none opacity-60",
            )}
          >
            {isLoggingOut ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <LogOut className="size-4 shrink-0" />
            )}
            {isLoggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}
