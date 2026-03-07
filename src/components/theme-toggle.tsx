"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  localStorage.setItem("theme", mode);
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") {
    return saved;
  }

  return "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  function toggle() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      aria-label="Alternar tema"
      title="Alternar tema"
    >
      <span aria-hidden="true" className="text-sm">{mode === "dark" ? "☀️" : "🌙"}</span>
      {mode === "dark" ? "Modo Claro" : "Modo Escuro"}
    </button>
  );
}
