"use client";

import { Building2, LogOut, Video } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
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
import { useWorkspaceNavigation } from "@/features/auth/hooks/use-workspace-navigation";
import { useWorkspaceSwitchState } from "@/features/auth/lib/workspace-switch-state";
import type { WorkspaceRole } from "@/features/auth/hooks/use-me-query";
import { useAuth } from "@/providers/auth-provider";

function workspaceItemClass(isActive: boolean) {
  return cn(
    accountMenuItemClass,
    "text-left",
    isActive && "bg-foreground/5 dark:bg-white/[0.08]",
  );
}

export function NavbarProfileMenu({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const { user, logout, isLoggingOut } = useAuth();
  const { goWorkspace } = useWorkspaceNavigation();
  const { isSwitching, targetRole } = useWorkspaceSwitchState();
  const pathname = usePathname();

  if (!user) return null;

  const display = getDisplayNameFromUser(user);
  const initials = getInitialsFromUser(user);
  const activeWorkspace: WorkspaceRole | null =
    user.activeRole ?? user.primaryRole ?? null;
  const showProfiles = true;
  const brandProfileHref = "/brand/account";
  const creatorProfileHref = "/creator/account";
  const isBrandPath = pathname === brandProfileHref || pathname.startsWith("/brand/");
  const isCreatorPath =
    pathname === creatorProfileHref || pathname.startsWith("/creator/");

  const wrapNavigate = (fn?: () => void) => () => {
    onNavigate?.();
    fn?.();
  };

  const brandPending = isSwitching && targetRole === "BRAND";
  const creatorPending = isSwitching && targetRole === "CREATOR";

  function workspaceActionLabel(
    baseLabel: string,
    isCurrentPath: boolean,
    isPending: boolean,
  ) {
    if (isPending) return "Opening...";
    if (isCurrentPath) return "Open";
    return baseLabel;
  }

  if (onNavigate) {
    return (
      <div className={cn("space-y-1", className)}>
        <ThemeAppearancePanel className="mb-2" />
        <div
          className={cn(
            "mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5",
            accountMenuGlassPanel,
          )}
        >
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              "border border-border/60 bg-background/40 backdrop-blur-sm",
            )}
            aria-hidden
          >
              <span className="text-sm font-semibold text-muted-foreground">
                {initials}
              </span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {display}
              </p>
            </div>
          </div>
        {showProfiles ? (
          <div
            className={cn("space-y-0.5 rounded-xl p-1", accountMenuGlassPanel)}
          >
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Continue As
            </p>
            <button
              type="button"
              className={cn(
                workspaceItemClass(isBrandPath || activeWorkspace === "BRAND"),
                "w-full",
                brandPending && "pointer-events-none opacity-70",
              )}
              disabled={isSwitching}
              onClick={wrapNavigate(
                () =>
                  void goWorkspace("BRAND", {
                    redirectIfCurrent: true,
                    targetHref: brandProfileHref,
                  }),
              )}
            >
              {brandPending ? (
                <Spinner className="size-4" aria-hidden />
              ) : (
                <Building2 className="size-4" />
              )}
              <span className="flex flex-1 items-center justify-between gap-2">
                As Brand
                {isBrandPath || brandPending ? (
                  <span className="text-[10px] font-medium text-primary">
                    {workspaceActionLabel("Open", isBrandPath, brandPending)}
                  </span>
                ) : null}
              </span>
            </button>
            <button
              type="button"
              className={cn(
                workspaceItemClass(isCreatorPath || activeWorkspace === "CREATOR"),
                "w-full",
                creatorPending && "pointer-events-none opacity-70",
              )}
              disabled={isSwitching}
              onClick={wrapNavigate(
                () =>
                  void goWorkspace("CREATOR", {
                    redirectIfCurrent: true,
                    targetHref: creatorProfileHref,
                  }),
              )}
            >
              {creatorPending ? (
                <Spinner className="size-4" aria-hidden />
              ) : (
                <Video className="size-4" />
              )}
              <span className="flex flex-1 items-center justify-between gap-2">
                As Creator
                {isCreatorPath || creatorPending ? (
                  <span className="text-[10px] font-medium text-primary">
                    {workspaceActionLabel(
                      "Open",
                      isCreatorPath,
                      creatorPending,
                    )}
                  </span>
                ) : null}
              </span>
            </button>
          </div>
        ) : null}
        <div
          className={cn("space-y-0.5 rounded-xl p-1", accountMenuGlassPanel)}
        >
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={wrapNavigate(() => void logout())}
            className={cn(
              accountMenuItemLogoutClass,
              "text-left",
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
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="group relative">
        <button
          type="button"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            "border border-border/60 bg-background/50 backdrop-blur-md backdrop-saturate-125",
            "text-muted-foreground transition-colors",
            "hover:bg-background/70 dark:hover:bg-background/40",
            "group-hover:text-primary",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
          aria-haspopup="menu"
          aria-label={`Account menu (${display})`}
        >
          <span className="text-sm font-semibold">{initials}</span>
        </button>

        <div
          className={cn(
            "absolute right-0 top-full z-50 pt-2",
            "invisible opacity-0 transition-[opacity,visibility] duration-150",
            "group-hover:visible group-hover:opacity-100",
            "group-focus-within:visible group-focus-within:opacity-100",
          )}
          role="menu"
          aria-label="Account actions"
        >
          <div className="min-w-60 space-y-2">
            <ThemeAppearancePanel className="bg-background/95 backdrop-blur-xl" />
            <div className={cn("rounded-xl p-1", accountMenuGlassPanel, "bg-background/95 backdrop-blur-xl")}>
            {showProfiles ? (
              <>
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Continue As
                </p>
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    workspaceItemClass(isBrandPath || activeWorkspace === "BRAND"),
                    "w-full",
                    brandPending && "pointer-events-none opacity-70",
                  )}
                  disabled={isSwitching}
                  onClick={() =>
                    void goWorkspace("BRAND", {
                      redirectIfCurrent: true,
                      targetHref: brandProfileHref,
                    })
                  }
                >
                  {brandPending ? (
                    <Spinner className="size-4" aria-hidden />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                  <span className="flex flex-1 items-center justify-between gap-2">
                    As Brand
                    {isBrandPath || brandPending ? (
                      <span className="text-[10px] font-medium text-primary">
                        {workspaceActionLabel("Open", isBrandPath, brandPending)}
                      </span>
                    ) : null}
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    workspaceItemClass(
                      isCreatorPath || activeWorkspace === "CREATOR",
                    ),
                    "w-full",
                    creatorPending && "pointer-events-none opacity-70",
                  )}
                  disabled={isSwitching}
                  onClick={() =>
                    void goWorkspace("CREATOR", {
                      redirectIfCurrent: true,
                      targetHref: creatorProfileHref,
                    })
                  }
                >
                  {creatorPending ? (
                    <Spinner className="size-4" aria-hidden />
                  ) : (
                    <Video className="size-4" />
                  )}
                  <span className="flex flex-1 items-center justify-between gap-2">
                    As Creator
                    {isCreatorPath || creatorPending ? (
                      <span className="text-[10px] font-medium text-primary">
                        {workspaceActionLabel(
                          "Open",
                          isCreatorPath,
                          creatorPending,
                        )}
                      </span>
                    ) : null}
                  </span>
                </button>
                <div
                  className="my-1 h-px bg-border/60"
                  role="separator"
                  aria-hidden
                />
              </>
            ) : null}
            <button
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              onClick={() => void logout()}
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
    </div>
  );
}
