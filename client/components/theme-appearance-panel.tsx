"use client";

import { ChevronDown, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import {
  accountMenuGlassPanel,
  accountMenuItemClass,
} from "@/components/account-menu-styles";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { type ThemeColor, useThemeColor } from "@/providers/theme-provider";

function useThemeMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeAppearancePanel({
  className,
}: {
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const { themeColor, setThemeColor, options } = useThemeColor();
  const themeMounted = useThemeMounted();
  const currentTheme = themeMounted && resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div className={cn("rounded-xl p-1", accountMenuGlassPanel, className)}>
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Appearance
      </p>

      <div className="grid grid-cols-2 gap-1 px-1 pb-2">
        {[
          { value: "light", label: "Light", icon: Sun },
          { value: "dark", label: "Dark", icon: Moon },
        ].map(({ value, label, icon: Icon }) => {
          const active = themeMounted && currentTheme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 bg-background/40 text-foreground/80 hover:bg-background/70 hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      <div className="px-1 pb-1">
        <Accordion type="single" collapsible>
          <AccordionItem value="theme" className="border-0">
            <AccordionTrigger className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-background/60 hover:text-foreground/80 focus-visible:ring-ring/40 focus-visible:ring-offset-0">
              <span className="flex flex-1 items-center justify-between gap-3">
                <span>Theme</span>
                <span className="inline-flex items-center gap-2 text-[11px] font-medium normal-case tracking-normal text-foreground/80">
                  <span
                    className="size-2.5 rounded-full border border-black/10 dark:border-white/10"
                    style={{
                      backgroundColor:
                        options.find((option) => option.value === themeColor)
                          ?.swatch ?? "currentColor",
                    }}
                    aria-hidden
                  />
                  {options.find((option) => option.value === themeColor)?.label}
                </span>
              </span>
              <ChevronDown
                className="chevron size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                aria-hidden
              />
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <div className="space-y-0.5 pt-1">
                {options.map((option) => {
                  const active = themeColor === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setThemeColor(option.value as ThemeColor)}
                      className={cn(
                        accountMenuItemClass,
                        "justify-between rounded-lg",
                        active &&
                          "bg-primary/10 text-primary [&_svg]:text-primary",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full border border-black/10 dark:border-white/10"
                          style={{ backgroundColor: option.swatch }}
                          aria-hidden
                        />
                        <span>{option.label}</span>
                      </span>
                      <span
                        className={cn(
                          "size-2 rounded-full border transition-all",
                          active
                            ? "border-primary bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_18%,transparent)]"
                            : "border-border/70 bg-transparent",
                        )}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
