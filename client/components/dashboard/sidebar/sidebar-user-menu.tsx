"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  LogOut,
  Shield,
  UserRound,
  Building2,
  Video,
} from "lucide-react";
import {
  accountMenuGlassPanel,
  accountMenuItemClass,
  accountMenuItemLogoutClass,
} from "@/components/account-menu-styles";
import {
  getDisplayNameFromUser,
  getInitialsFromUser,
} from "@/lib/account-user";
import { ThemeAppearancePanel } from "@/components/theme-appearance-panel";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspaceNavigation } from "@/features/auth/hooks/use-workspace-navigation";

export function SidebarUserMenu({
  desktopCollapsed,
  onNavigate,
}: {
  desktopCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout, isLoggingOut, isLoading } = useAuth();
  const { goWorkspace, switchingWorkspaceRole } = useWorkspaceNavigation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const hasMultipleRoles = user?.roles && user.roles.length > 1;
  const activeWorkspace = pathname.startsWith("/brand")
    ? "BRAND"
    : pathname.startsWith("/creator")
      ? "CREATOR"
      : user?.primaryRole ?? null;
  const hub = pathname.startsWith("/brand")
    ? "brand"
    : pathname.startsWith("/creator")
      ? "creator"
      : activeWorkspace === "BRAND"
        ? "brand"
        : "creator";
  const settingsHref = hub === "brand" ? "/brand/account" : "/creator/settings";
  const accountHref = `/${hub}/account`;

  const isAccountSectionActive =
    pathname === accountHref || pathname.startsWith(`${accountHref}/`);

  const notificationsHref = `${settingsHref}/notifications`;
  const securityHref = `${settingsHref}/security`;
  const isNotificationsActive =
    pathname === notificationsHref ||
    pathname.startsWith(`${notificationsHref}/`);
  const isSecurityActive =
    pathname === securityHref || pathname.startsWith(`${securityHref}/`);
  const switchingToBrand = switchingWorkspaceRole === "BRAND";
  const switchingToCreator = switchingWorkspaceRole === "CREATOR";

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

  const name = getDisplayNameFromUser(user);
  const label = `Account menu (${name})`;

  const panelVisibleMobile = mobileOpen;

  return (
    <div ref={wrapRef} className="group relative">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none transition-colors",
          "hover:bg-linear-to-r hover:from-primary/10 hover:to-transparent",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
          {getInitialsFromUser(user)}
        </span>
        <div className={cn("min-w-0 flex-1", desktopCollapsed && "lg:hidden")}>
          <p className="truncate text-sm font-medium text-foreground">
            {name}
          </p>
        </div>
      </button>

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
        <div className="min-w-60 space-y-2">
          <ThemeAppearancePanel />
          <div className={cn("rounded-xl p-1", accountMenuGlassPanel)}>
          {!hasMultipleRoles && user?.roles?.includes("CREATOR") && (
            <button
              type="button"
              role="menuitem"
              disabled={switchingToBrand}
              className={cn(
                accountMenuItemClass,
                "w-full text-left",
                switchingToBrand && "pointer-events-none opacity-70",
              )}
              onClick={() => {
                closeMobile();
                void goWorkspace("BRAND");
              }}
            >
              {switchingToBrand ? (
                <Spinner className="size-4" aria-hidden />
              ) : (
                <Building2 className="size-4 opacity-60" aria-hidden />
              )}
              {switchingToBrand ? "Switching to Brand…" : "Try As Brand"}
            </button>
          )}
          {!hasMultipleRoles && user?.roles?.includes("BRAND") && (
            <button
              type="button"
              role="menuitem"
              disabled={switchingToCreator}
              className={cn(
                accountMenuItemClass,
                "w-full text-left",
                switchingToCreator && "pointer-events-none opacity-70",
              )}
              onClick={() => {
                closeMobile();
                void goWorkspace("CREATOR");
              }}
            >
              {switchingToCreator ? (
                <Spinner className="size-4" aria-hidden />
              ) : (
                <Video className="size-4 opacity-60" aria-hidden />
              )}
              {switchingToCreator ? "Switching to Creator…" : "Try As Creator"}
            </button>
          )}
          <Link
            href={settingsHref}
            role="menuitem"
            className={cn(
              accountMenuItemClass,
              "w-full",
              isNotificationsActive && "bg-accent/80 text-accent-foreground",
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
              isSecurityActive && "bg-accent/80 text-accent-foreground",
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
              <Spinner className="size-4 shrink-0" aria-hidden />
            ) : (
              <LogOut className="size-4 shrink-0" />
            )}
            {isLoggingOut ? "Logging out…" : "Log out"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
