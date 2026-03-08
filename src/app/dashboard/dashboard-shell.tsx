"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "./sign-out-button";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail: string;
  userRole: string;
};

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: "DB" },
  { href: "/dashboard/agenda", label: "Agenda", icon: "AG" },
  {
    href: "/dashboard/cadastros",
    label: "Cadastros",
    icon: "CD",
    matchPrefixes: ["/dashboard/cadastros", "/dashboard/clientes", "/dashboard/barbeiros", "/dashboard/servicos"],
  },
  { href: "/dashboard/admin", label: "Admin", icon: "AD", adminOnly: true, matchPrefix: true },
];

export function DashboardShell({ children, userEmail, userRole }: DashboardShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsOpen((state) => !state)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-gray-200 bg-white p-2 text-gray-900 shadow-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 md:hidden"
        aria-label="Alternar menu"
      >
        {isOpen ? (
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.6" fill="none" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.6" fill="none" />
          </svg>
        )}
      </button>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 md:translate-x-0 dark:border-gray-700 dark:bg-gray-900 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="border-b border-gray-200 px-6 py-6 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-xs font-bold text-white dark:bg-gray-200 dark:text-gray-900">
              BM
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-tight text-gray-900 dark:text-white">Premium Cut</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Painel Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-4 py-5">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            Menu
          </p>
          {menuItems.map((item) => {
            if (item.adminOnly && userRole !== "ADMIN") {
              return null;
            }

            const matchesPrefix = item.matchPrefix ? pathname.startsWith(item.href) : false;
            const matchesGroup = item.matchPrefixes ? item.matchPrefixes.some((prefix) => pathname.startsWith(prefix)) : false;
            const active = matchesPrefix || matchesGroup || pathname === item.href;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-gray-900 text-white dark:bg-sky-600 dark:text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-semibold ${
                    active
                      ? "bg-white/20 text-white dark:bg-sky-500/40 dark:text-white"
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="space-y-3 border-t border-gray-200 px-4 py-4 dark:border-gray-800">
          <ThemeToggle />
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-semibold text-gray-900 dark:text-white">{userEmail}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{userRole}</p>
          </div>
          <SignOutButton className="w-full" />
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen bg-white px-4 pb-8 pt-20 dark:bg-gray-950 md:ml-64 md:px-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
