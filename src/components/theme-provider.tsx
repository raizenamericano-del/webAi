"use client";

import * as React from "react";

type Ctx = { theme: string; setTheme: (t: "dark" | "light" | "system") => void; resolved: "dark" | "light" };

const ThemeCtx = React.createContext<Ctx>({ theme: "dark", setTheme: () => {}, resolved: "dark" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<string>("dark");
  const [resolved, setResolved] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    const stored = localStorage.getItem("neural-theme") || "dark";
    setThemeState(stored);
  }, []);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      setResolved(isDark ? "dark" : "light");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = React.useCallback((t: "dark" | "light" | "system") => {
    setThemeState(t);
    localStorage.setItem("neural-theme", t);
  }, []);

  return <ThemeCtx.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => React.useContext(ThemeCtx);
