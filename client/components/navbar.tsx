"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  Menu,
  X,
  User,
  Video,
  Building2,
  Sparkles,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

const navLinks = [
  { href: "/creator/dashboard", label: "For Creators", icon: Video },
  { href: "/brand/dashboard", label: "For Brands", icon: Building2 },
];

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
  const { isAuthenticated, isLoading, logout } = useAuth();

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

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              asChild
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Link href={href}>
                <Icon className="size-4" />
                {label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {isLoading ? (
            <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
          ) : isAuthenticated ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/brand/dashboard">Dashboard</Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={logout}
                aria-label="Log out"
              >
                <LogOut className="size-4" />
              </Button>
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
          mobileOpen ? "max-h-80" : "max-h-0 border-t-0",
        )}
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
          <hr className="my-1 border-border/60" />
          {isAuthenticated ? (
            <>
              <Link
                href="/brand/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOut className="size-4" />
                Log out
              </button>
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
