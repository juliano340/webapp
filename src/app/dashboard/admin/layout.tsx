import Link from "next/link";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <nav className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <Link
          href="/dashboard/admin"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Visao geral
        </Link>
        <Link
          href="/dashboard/admin/logs"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Logs
        </Link>
        <Link
          href="/dashboard/admin/comissoes"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Comissoes
        </Link>
        <Link
          href="/dashboard/admin/crm"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          CRM
        </Link>
        <Link
          href="/dashboard/admin/solicitacoes"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Solicitacoes
        </Link>
        <Link
          href="/dashboard/admin/usuarios"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Usuarios/Admins
        </Link>
        <Link
          href="/dashboard/admin/parametros"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Parametros
        </Link>
      </nav>

      {children}
    </section>
  );
}
