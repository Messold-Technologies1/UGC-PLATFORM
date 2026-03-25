"use client";

import { Loader2, LogOut, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

const glassPanel =
  "border border-border/60 bg-background/50 shadow-lg backdrop-blur-md backdrop-saturate-125";

const menuItemClass = cn(
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none",
  "text-foreground/90 transition-[background-color,color,transform] duration-150 ease-out",
  "hover:bg-foreground/10 hover:text-foreground dark:hover:bg-white/[0.14]",
  "active:scale-[0.99]",
  "[&_svg]:shrink-0 [&_svg]:text-muted-foreground [&_svg]:transition-colors [&_svg]:duration-150",
  "hover:[&_svg]:text-primary",
  "focus-visible:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/40 dark:focus-visible:bg-white/[0.14]",
);

const menuItemLogoutClass = cn(
  menuItemClass,
  "hover:text-destructive hover:[&_svg]:text-destructive dark:hover:bg-destructive/10",
);

export function NavbarProfileMenu({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const { user, logout, isLoggingOut } = useAuth();

  if (!user) return null;

  const display = user.name?.trim() || user.email;

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
            glassPanel,
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
        <div className={cn("space-y-0.5 rounded-xl p-1", glassPanel)}>
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={wrapNavigate(() => void logout())}
            className={cn(
              menuItemLogoutClass,
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
          <div className={cn("min-w-44 rounded-xl p-1", glassPanel)}>
            <button
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              onClick={() => void logout()}
              className={cn(
                menuItemLogoutClass,
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
