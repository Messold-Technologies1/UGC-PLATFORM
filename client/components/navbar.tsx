"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Menu, X, User, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NavbarProfileMenu } from "@/components/navbar-profile-menu";
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

  return (
    <header className="sticky top-0 z-50 w-full bg-background/50 backdrop-blur-sm backdrop-saturate-125">
      <div className="mx-auto flex h-17 max-w-site items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" prefetch className="flex items-center gap-2">
          {}
          <span className="text-lg font-bold tracking-tight">{SITE_NAME}</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {isLoading ? (
            <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
          ) : isAuthenticated ? (
            <NavbarProfileMenu />
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
          mobileOpen
            ? "max-h-[min(100dvh-5.25rem,28rem)] overflow-y-auto"
            : "max-h-0 border-t-0",
        )}
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {isAuthenticated ? (
            <NavbarProfileMenu onNavigate={() => setMobileOpen(false)} />
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
