"use client";

import { signOut } from "next-auth/react";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  async function handleSignOut() {
    await signOut({ redirect: false });
    window.location.assign("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white ${className ?? ""}`}
      type="button"
    >
      Sair
    </button>
  );
}
