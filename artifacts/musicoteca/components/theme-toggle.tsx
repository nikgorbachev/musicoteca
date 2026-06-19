"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      className="border border-warm-line px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-warm-grey transition-colors hover:border-ink hover:text-ink dark:border-cool-line dark:text-cool-grey dark:hover:border-chalk dark:hover:text-chalk"
    >
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
