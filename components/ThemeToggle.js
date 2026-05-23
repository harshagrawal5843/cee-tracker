"use client";

import { useEffect, useState } from "react";
import {
  applyStoredThemePreference,
  readThemePreference,
  writeThemePreference,
} from "@/lib/storage";

export function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const initialTheme = applyStoredThemePreference();
    setTheme(initialTheme);

    const syncTheme = () => {
      setTheme(readThemePreference());
    };

    window.addEventListener("storage", syncTheme);
    window.addEventListener("cee-theme-updated", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("cee-theme-updated", syncTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    writeThemePreference(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-800 shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:border-blue-300 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-100 dark:hover:border-blue-500 dark:hover:text-blue-300"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span>{theme === "dark" ? "🌙" : "☀️"}</span>
      <span>{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
