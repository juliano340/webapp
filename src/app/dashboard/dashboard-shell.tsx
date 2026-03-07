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
  { href: "/dashboard/clientes", label: "Clientes", icon: "CL" },
  { href: "/dashboard/barbeiros", label: "Barbeiros", icon: "BB" },
  { href: "/dashboard/servicos", label: "Servicos", icon: "SV" },
];

export function DashboardShell({ children, userEmail, userRole }: DashboardShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen bg-[#f6f6f8] dark:bg-[#0b1220]">
      <button
        type="button"
        onClick={() => setIsOpen((state) => !state)}
        className="fixed left-4 top-4 z-50 rounded-md border border-zinc-300 bg-white p-2 text-black shadow-sm md:hidden dark:bg-slate-800 dark:border-slate-600 dark:text-white"
        aria-label="Alternar menu"
      >
        {isOpen ? (
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        )}
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/25 transition md:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-zinc-200 bg-white transition-transform md:translate-x-0 dark:bg-slate-900 dark:border-slate-700 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="border-b border-zinc-200 px-6 py-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-xs font-bold text-white dark:bg-white dark:text-black">
              BM
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-tight text-black dark:text-white">Premium Cut</p>
              <p className="text-xs text-zinc-500 dark:text-slate-400">Painel Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-4 py-5">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-slate-400">
            Menu
          </p>
          <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-slate-500">
            Cadastros
          </p>
          {menuItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                  active
                    ? "border-black/10 bg-black/5 text-black dark:border-white/10 dark:bg-white/10 dark:text-white"
                    : "border-transparent text-zinc-600 hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-semibold ${
                    active ? "bg-black text-white dark:bg-white dark:text-black" : "bg-zinc-200 text-zinc-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-4 border-t border-zinc-200 px-4 py-4 dark:border-slate-700">
          <ThemeToggle />
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold text-black dark:text-white">{userEmail}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-zinc-500 dark:text-slate-400">{userRole}</p>
          </div>
          <SignOutButton className="w-full" />
        </div>
      </aside>

      <main className="min-h-screen bg-transparent px-4 pb-8 pt-20 md:ml-64 md:px-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
