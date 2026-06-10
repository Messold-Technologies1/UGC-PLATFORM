"use client";

import { useState } from "react";
import { Building2, LogOut, Shield, Video, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  accountMenuGlassPanel,
  accountMenuItemClass,
  accountMenuItemLogoutClass,
} from "@/components/navbar/account-menu-styles";
import {
  getDisplayNameFromUser,
  getInitialsFromUser,
} from "@/lib/account-user";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { ThemeAppearancePanel } from "@/components/theme-appearance-panel";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspaceNavigation } from "@/features/auth/hooks/use-workspace-navigation";
import type { WorkspaceRole } from "@/features/auth/hooks/use-me-query";
import {
  canSetUpWorkspace,
  canSwitchToWorkspace,
  workspaceAccountHref,
  workspaceSetupHref,
} from "@/features/auth/lib/workspace-menu";
import { useAuth } from "@/providers/auth-provider";
import { ChangePasswordDialog } from "@/features/auth/components/change-password-dialog";

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
  const { goWorkspace, switchingWorkspaceRole } = useWorkspaceNavigation();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const display = getDisplayNameFromUser(user);
  const initials = getInitialsFromUser(user);
  const activeWorkspace: WorkspaceRole | null =
    pathname === "/brand" || pathname.startsWith("/brand/")
      ? "BRAND"
      : pathname === "/creator" || pathname.startsWith("/creator/")
        ? "CREATOR"
        : (user.primaryRole ?? null);
  const brandProfileHref = workspaceAccountHref("BRAND");
  const creatorProfileHref = workspaceAccountHref("CREATOR");
  const isBrandPath =
    pathname === brandProfileHref || pathname.startsWith("/brand/");
  const isCreatorPath =
    pathname === creatorProfileHref || pathname.startsWith("/creator/");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const showPasswordSecurity =
    !pathname.startsWith("/admin") &&
    (isBrandPath ||
      isCreatorPath ||
      activeWorkspace === "BRAND" ||
      activeWorkspace === "CREATOR");
  const canContinueAsBrand = canSwitchToWorkspace(user, "BRAND");
  const canContinueAsCreator = canSwitchToWorkspace(user, "CREATOR");
  const canTryAsBrand = canSetUpWorkspace(user, "BRAND");
  const canTryAsCreator = canSetUpWorkspace(user, "CREATOR");
  const isAdmin = user.roles?.includes("ADMIN");
  const showProfiles =
    !isAdmin &&
    (canContinueAsBrand ||
      canContinueAsCreator ||
      canTryAsBrand ||
      canTryAsCreator);
  const profileSectionLabel =
    canContinueAsBrand || canContinueAsCreator ? "Continue As" : "Try As";
  const switchingToBrand = switchingWorkspaceRole === "BRAND";
  const switchingToCreator = switchingWorkspaceRole === "CREATOR";

  const wrapNavigate = (fn?: () => void) => () => {
    onNavigate?.();
    fn?.();
  };

  const navigateToSetup = (href: string) => {
    beginClientNavigation();
    router.push(href);
  };

  if (onNavigate) {
    return (
      <>
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
              {profileSectionLabel}
            </p>
            {canContinueAsBrand || canTryAsBrand ? (
              <button
                type="button"
                className={cn(
                  workspaceItemClass(
                    canContinueAsBrand &&
                      (isBrandPath || activeWorkspace === "BRAND"),
                  ),
                  "w-full",
                )}
                disabled={
                  isLoggingOut || (canContinueAsBrand && switchingToBrand)
                }
                onClick={wrapNavigate(() => {
                  if (canContinueAsBrand) {
                    void goWorkspace("BRAND", {
                      redirectIfCurrent: true,
                      targetHref: brandProfileHref,
                    });
                    return;
                  }

                  navigateToSetup(
                    workspaceSetupHref("BRAND", brandProfileHref),
                  );
                })}
              >
                {canContinueAsBrand && switchingToBrand ? (
                  <Spinner className="size-4 shrink-0" aria-hidden />
                ) : (
                  <Building2 className="size-4" />
                )}
                <span className="flex flex-1 items-center justify-between gap-2">
                  {canContinueAsBrand
                    ? switchingToBrand
                      ? "Switching to Brand…"
                      : "As Brand"
                    : "Try As Brand"}
                  {canContinueAsBrand && !switchingToBrand && isBrandPath ? (
                    <span className="text-[10px] font-medium text-primary">
                      Open
                    </span>
                  ) : null}
                </span>
              </button>
            ) : null}
            {canContinueAsCreator || canTryAsCreator ? (
              <button
                type="button"
                className={cn(
                  workspaceItemClass(
                    canContinueAsCreator &&
                      (isCreatorPath || activeWorkspace === "CREATOR"),
                  ),
                  "w-full",
                )}
                disabled={
                  isLoggingOut || (canContinueAsCreator && switchingToCreator)
                }
                onClick={wrapNavigate(() => {
                  if (canContinueAsCreator) {
                    void goWorkspace("CREATOR", {
                      redirectIfCurrent: true,
                      targetHref: creatorProfileHref,
                    });
                    return;
                  }

                  navigateToSetup(
                    workspaceSetupHref("CREATOR", creatorProfileHref),
                  );
                })}
              >
                {canContinueAsCreator && switchingToCreator ? (
                  <Spinner className="size-4 shrink-0" aria-hidden />
                ) : (
                  <Video className="size-4" />
                )}
                <span className="flex flex-1 items-center justify-between gap-2">
                  {canContinueAsCreator
                    ? switchingToCreator
                      ? "Switching to Creator…"
                      : "As Creator"
                    : "Try As Creator"}
                  {canContinueAsCreator &&
                  !switchingToCreator &&
                  isCreatorPath ? (
                    <span className="text-[10px] font-medium text-primary">
                      Open
                    </span>
                  ) : null}
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
        {!pathname.startsWith("/admin") && (
          <>
            <div
              className={cn("space-y-0.5 rounded-xl p-1", accountMenuGlassPanel)}
            >
              <Link
                href={
                  activeWorkspace === "BRAND"
                    ? brandProfileHref
                    : creatorProfileHref
                }
                className={cn(
                  accountMenuItemClass,
                  "w-full",
                  (pathname === brandProfileHref ||
                    pathname === creatorProfileHref) &&
                    "bg-accent/80 text-accent-foreground",
                )}
                onClick={wrapNavigate()}
              >
                <UserRound className="size-4 shrink-0" aria-hidden />
                Profile
              </Link>
              {showPasswordSecurity ? (
                <button
                  type="button"
                  className={cn(accountMenuItemClass, "w-full text-left")}
                  onClick={wrapNavigate(() => setPasswordDialogOpen(true))}
                >
                  <Shield className="size-4 shrink-0" aria-hidden />
                  Password &amp; security
                </button>
              ) : null}
            </div>
          </>
        )}
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
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
        />
      </>
    );
  }

  return (
    <>
      <div className={cn("relative", className)}>
      <div className="group relative">
        <button
          type="button"
          className={cn(
            "flex h-9 shrink-0 items-center justify-center gap-2 rounded-full pl-1 pr-3",
            "border border-border/60 bg-background/50 backdrop-blur-md backdrop-saturate-125",
            "text-muted-foreground transition-colors",
            "hover:bg-background/70 dark:hover:bg-background/40",
            "group-hover:text-primary",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
          aria-haspopup="menu"
          aria-label={`Account menu (${display})`}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-muted/80 text-xs font-semibold">
            {initials}
          </span>
          <span className="text-sm font-medium max-w-30 truncate">
            {display}
          </span>
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
          <div
            className={cn(
              "min-w-60 flex flex-col overflow-hidden rounded-2xl",
              "bg-background/95 dark:bg-background/80",
              "backdrop-blur-2xl backdrop-saturate-[1.2]",
              "border border-white/50 dark:border-white/20",
              "shadow-xl",
            )}
          >
            <ThemeAppearancePanel className="border-0 bg-transparent shadow-none backdrop-blur-none backdrop-saturate-100 rounded-none border-b border-border/50" />
            <div className={cn("p-1")}>
              {showProfiles ? (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {profileSectionLabel}
                  </p>
                  {canContinueAsBrand || canTryAsBrand ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        workspaceItemClass(
                          canContinueAsBrand &&
                            (isBrandPath || activeWorkspace === "BRAND"),
                        ),
                        "w-full",
                      )}
                      disabled={
                        isLoggingOut || (canContinueAsBrand && switchingToBrand)
                      }
                      onClick={() => {
                        if (canContinueAsBrand) {
                          void goWorkspace("BRAND", {
                            redirectIfCurrent: true,
                            targetHref: brandProfileHref,
                          });
                          return;
                        }

                        navigateToSetup(
                          workspaceSetupHref("BRAND", brandProfileHref),
                        );
                      }}
                    >
                      {canContinueAsBrand && switchingToBrand ? (
                        <Spinner className="size-4 shrink-0" aria-hidden />
                      ) : (
                        <Building2 className="size-4" />
                      )}
                      <span className="flex flex-1 items-center justify-between gap-2">
                        {canContinueAsBrand
                          ? switchingToBrand
                            ? "Switching to Brand…"
                            : "As Brand"
                          : "Try As Brand"}
                        {canContinueAsBrand &&
                        !switchingToBrand &&
                        isBrandPath ? (
                          <span className="text-[10px] font-medium text-primary">
                            Open
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ) : null}
                  {canContinueAsCreator || canTryAsCreator ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        workspaceItemClass(
                          canContinueAsCreator &&
                            (isCreatorPath || activeWorkspace === "CREATOR"),
                        ),
                        "w-full",
                      )}
                      disabled={
                        isLoggingOut ||
                        (canContinueAsCreator && switchingToCreator)
                      }
                      onClick={() => {
                        if (canContinueAsCreator) {
                          void goWorkspace("CREATOR", {
                            redirectIfCurrent: true,
                            targetHref: creatorProfileHref,
                          });
                          return;
                        }

                        navigateToSetup(
                          workspaceSetupHref("CREATOR", creatorProfileHref),
                        );
                      }}
                    >
                      {canContinueAsCreator && switchingToCreator ? (
                        <Spinner className="size-4 shrink-0" aria-hidden />
                      ) : (
                        <Video className="size-4" />
                      )}
                      <span className="flex flex-1 items-center justify-between gap-2">
                        {canContinueAsCreator
                          ? switchingToCreator
                            ? "Switching to Creator…"
                            : "As Creator"
                          : "Try As Creator"}
                        {canContinueAsCreator &&
                        !switchingToCreator &&
                        isCreatorPath ? (
                          <span className="text-[10px] font-medium text-primary">
                            Open
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ) : null}
                  {showProfiles ? (
                    <div
                      className="my-1 h-px bg-border/60"
                      role="separator"
                      aria-hidden
                    />
                  ) : null}
                </>
              ) : null}
              {!pathname.startsWith("/admin") && (
                <>
                  <Link
                    href={
                      activeWorkspace === "BRAND"
                        ? brandProfileHref
                        : creatorProfileHref
                    }
                    role="menuitem"
                    className={cn(
                      accountMenuItemClass,
                      "w-full",
                      (pathname === brandProfileHref ||
                        pathname === creatorProfileHref) &&
                        "bg-accent/80 text-accent-foreground",
                    )}
                  >
                    <UserRound className="size-4" aria-hidden />
                    Profile
                  </Link>
                  {showPasswordSecurity ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        accountMenuItemClass,
                        "w-full text-left",
                      )}
                      onClick={() => setPasswordDialogOpen(true)}
                    >
                      <Shield className="size-4" aria-hidden />
                      Password &amp; security
                    </button>
                  ) : null}
                </>
              )}
              <div
                className="my-1 h-px bg-border/60"
                role="separator"
                aria-hidden
              />
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
      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </>
  );
}
