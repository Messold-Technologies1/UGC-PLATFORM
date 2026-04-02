"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

const THEME_COLOR_STORAGE_KEY = "ugc-theme-color";

const themeColorOptions = [
  { value: "blue", label: "Blue", swatch: "#3b82f6" },
  { value: "green", label: "Green", swatch: "#65a30d" },
  { value: "neutral", label: "Neutral", swatch: "#737373" },
  { value: "orange", label: "Orange", swatch: "#f97316" },
  { value: "red", label: "Red", swatch: "#ef4444" },
  { value: "rose", label: "Rose", swatch: "#f43f5e" },
  { value: "violet", label: "Violet", swatch: "#8b5cf6" },
  { value: "yellow", label: "Yellow", swatch: "#ca8a04" },
] as const;

export type ThemeColor = (typeof themeColorOptions)[number]["value"];

type ThemeColorContextValue = {
  themeColor: ThemeColor;
  setThemeColor: (value: ThemeColor) => void;
  options: typeof themeColorOptions;
};

const ThemeColorContext = createContext<ThemeColorContextValue | null>(null);

function isThemeColor(value: string): value is ThemeColor {
  return themeColorOptions.some((option) => option.value === value);
}

function ThemeColorProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    if (typeof document !== "undefined") {
      const activeThemeColor = document.documentElement.dataset.themeColor;
      if (activeThemeColor && isThemeColor(activeThemeColor)) {
        return activeThemeColor;
      }
    }

    return "rose";
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_COLOR_STORAGE_KEY);
      if (saved && isThemeColor(saved)) {
        setThemeColor(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.dataset.themeColor = themeColor;
    try {
      window.localStorage.setItem(THEME_COLOR_STORAGE_KEY, themeColor);
    } catch {}
  }, [themeColor]);

  const value = useMemo(
    () => ({
      themeColor,
      setThemeColor,
      options: themeColorOptions,
    }),
    [themeColor],
  );

  return (
    <ThemeColorContext.Provider value={value}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeColorProvider>{children}</ThemeColorProvider>
    </NextThemesProvider>
  );
}

export function useThemeColor() {
  const context = useContext(ThemeColorContext);
  if (!context) {
    throw new Error("useThemeColor must be used within ThemeProvider");
  }
  return context;
}
