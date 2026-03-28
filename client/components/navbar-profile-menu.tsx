"use client";

import { Building2, Loader2, LogOut, UserRound, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  accountMenuGlassPanel,
  accountMenuItemClass,
  accountMenuItemLogoutClass,
} from "@/components/account-menu-styles";
import { Button } from "@/components/ui/button";
import { useWorkspaceNavigation } from "@/features/auth/hooks/use-workspace-navigation";
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

  if (!user) return null;

  const display = user.name?.trim() || user.email;
  const activeWorkspace: WorkspaceRole | null =
    user.activeRole ?? user.primaryRole ?? null;
  const hasBrand = user.roles.includes("BRAND");
  const hasCreator = user.roles.includes("CREATOR");
  const showWorkspace = hasBrand || hasCreator;

  const wrapNavigate = (fn?: () => void) => () => {
    onNavigate?.();
    fn?.();
  };

  if (onNavigate) {
    return (
      <div className={cn("space-y-1", className)}>
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
            <UserRound className="size-5 text-muted-foreground" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Account</p>
            <p className="sr-only">{display}</p>
          </div>
        </div>
        {showWorkspace ? (
          <div className={cn("space-y-0.5 rounded-xl p-1", accountMenuGlassPanel)}>
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace
            </p>
            {hasBrand ? (
              <button
                type="button"
                className={cn(
                  workspaceItemClass(activeWorkspace === "BRAND"),
                  "w-full",
                )}
                onClick={wrapNavigate(() =>
                  void goWorkspace("BRAND", { redirectIfCurrent: true }),
                )}
              >
                <Building2 className="size-4" />
                <span className="flex flex-1 items-center justify-between gap-2">
                  As Brand
                  {activeWorkspace === "BRAND" ? (
                    <span className="text-[10px] font-medium text-primary">
                      Current
                    </span>
                  ) : null}
                </span>
              </button>
            ) : null}
            {hasCreator ? (
              <button
                type="button"
                className={cn(
                  workspaceItemClass(activeWorkspace === "CREATOR"),
                  "w-full",
                )}
                onClick={wrapNavigate(() =>
                  void goWorkspace("CREATOR", { redirectIfCurrent: true }),
                )}
              >
                <Video className="size-4" />
                <span className="flex flex-1 items-center justify-between gap-2">
                  As Creator
                  {activeWorkspace === "CREATOR" ? (
                    <span className="text-[10px] font-medium text-primary">
                      Current
                    </span>
                  ) : null}
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
        <div className={cn("space-y-0.5 rounded-xl p-1", accountMenuGlassPanel)}>
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
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
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
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "size-9 shrink-0 rounded-full",
            "border border-border/60 bg-background/50 backdrop-blur-md backdrop-saturate-125",
            "text-muted-foreground transition-colors",
            "hover:bg-background/70 dark:hover:bg-background/40",
            "group-hover:text-primary",
          )}
          aria-haspopup="menu"
          aria-label={`Account menu (${display})`}
        >
          <UserRound
            className="size-4.5 transition-colors duration-200"
            strokeWidth={1.75}
          />
        </Button>

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
          <div className={cn("min-w-52 rounded-xl p-1", accountMenuGlassPanel)}>
            {showWorkspace ? (
              <>
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Workspace
                </p>
                {hasBrand ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={cn(workspaceItemClass(activeWorkspace === "BRAND"), "w-full")}
                    onClick={() =>
                      void goWorkspace("BRAND", { redirectIfCurrent: true })
                    }
                  >
                    <Building2 className="size-4" />
                    <span className="flex flex-1 items-center justify-between gap-2">
                      As Brand
                      {activeWorkspace === "BRAND" ? (
                        <span className="text-[10px] font-medium text-primary">
                          Current
                        </span>
                      ) : null}
                    </span>
                  </button>
                ) : null}
                {hasCreator ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={cn(
                      workspaceItemClass(activeWorkspace === "CREATOR"),
                      "w-full",
                    )}
                    onClick={() =>
                      void goWorkspace("CREATOR", { redirectIfCurrent: true })
                    }
                  >
                    <Video className="size-4" />
                    <span className="flex flex-1 items-center justify-between gap-2">
                      As Creator
                      {activeWorkspace === "CREATOR" ? (
                        <span className="text-[10px] font-medium text-primary">
                          Current
                        </span>
                      ) : null}
                    </span>
                  </button>
                ) : null}
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
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
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
