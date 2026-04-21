"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function useThemeMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function AuthThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const themeMounted = useThemeMounted();
  const isDark = themeMounted && resolvedTheme === "dark";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5">
      <div className="pointer-events-auto inline-flex items-center gap-3  bg-background/90 px-3 py-2 ">
        <Sun
          className={cn(
            "size-4 transition-colors",
            isDark ? "text-muted-foreground" : "text-primary",
          )}
          aria-hidden
        />
        <Switch
          checked={isDark}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        />
        <Moon
          className={cn(
            "size-4 transition-colors",
            isDark ? "text-primary" : "text-muted-foreground",
          )}
          aria-hidden
        />
      </div>
    </div>
  );
}
