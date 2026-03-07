"use client";

import { useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark";
const THEME_EVENT = "app-theme-change";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  localStorage.setItem("theme", mode);
  window.dispatchEvent(new Event(THEME_EVENT));
}

function getThemeSnapshot(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") {
    return saved;
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribeTheme(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === "theme") {
      callback();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_EVENT, callback);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function getServerThemeSnapshot(): ThemeMode {
  return "light";
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  function toggle() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
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
