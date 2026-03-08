import Link from "next/link";

export default function AdminCrmLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <section className="flex flex-col gap-4">
      <nav className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <Link
          href="/dashboard/admin/crm"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Visao geral
        </Link>
        <Link
          href="/dashboard/admin/crm/automacoes"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Automacoes
        </Link>
        <Link
          href="/dashboard/admin/crm/lembretes"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Lembretes
        </Link>
        <Link
          href="/dashboard/admin/crm/segmentos"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Segmentos
        </Link>
        <Link
          href="/dashboard/admin/crm/canal-whatsapp"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Canal WhatsApp
        </Link>
      </nav>

      {children}
    </section>
  );
}
