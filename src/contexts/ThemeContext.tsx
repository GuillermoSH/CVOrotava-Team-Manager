"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useHydrated } from "@/lib/useHydrated";
import { usePref } from "@/lib/usePref";

export type Theme = "light" | "dark";

const STORAGE_KEY = "cvorotava-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

const parseTheme = (raw: string | null): Theme =>
  raw === "light" ? "light" : "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = usePref<Theme>(STORAGE_KEY, parseTheme);
  // false en servidor y durante la hidratación, true después.
  const mounted = useHydrated();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme]
  );

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, mounted }),
    [theme, setTheme, toggleTheme, mounted]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
