"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Building2, Menu, X, User, Sparkles, Moon, Sun, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NavbarProfileMenu } from "@/components/navbar-profile-menu";
import { useWorkspaceNavigation } from "@/features/auth/hooks/use-workspace-navigation";
import { useAuth } from "@/providers/auth-provider";

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

  return (
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
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const { goWorkspace } = useWorkspaceNavigation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/50 backdrop-blur-md backdrop-saturate-125">
      <div className="mx-auto flex h-16 max-w-site items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-foreground flex size-8 items-center justify-center rounded-lg">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            UGC<span className="font-bold">Platform</span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {isLoading ? (
            <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
          ) : isAuthenticated ? (
            <>
              <div className="flex shrink-0 items-center gap-1 border-l border-border/60 pl-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-foreground/80"
                  onClick={() =>
                    void goWorkspace("BRAND", { redirectIfCurrent: true })
                  }
                >
                  <Building2 className="size-4" />
                  As Brand
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-foreground/80"
                  onClick={() =>
                    void goWorkspace("CREATOR", { redirectIfCurrent: true })
                  }
                >
                  <Video className="size-4" />
                  As Creator
                </Button>
              </div>
              <NavbarProfileMenu />
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-foreground border-0 text-background hover:opacity-90"
              >
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
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
        </div>
      </div>

      <div
        id="mobile-nav"
        role="navigation"
        aria-label="Mobile navigation"
        className={cn(
          "overflow-hidden border-t border-border/60 transition-all duration-200 md:hidden",
          mobileOpen ? "max-h-[min(100dvh-5rem,28rem)] overflow-y-auto" : "max-h-0 border-t-0",
        )}
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {isAuthenticated ? (
            <>
              <div className="mb-2 flex flex-col gap-1 border-b border-border/60 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void goWorkspace("BRAND", { redirectIfCurrent: true });
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Building2 className="size-4 text-muted-foreground" />
                  As Brand
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void goWorkspace("CREATOR", { redirectIfCurrent: true });
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Video className="size-4 text-muted-foreground" />
                  As Creator
                </button>
              </div>
              <NavbarProfileMenu onNavigate={() => setMobileOpen(false)} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                <User className="size-4" />
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
