import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type BarbeirosPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function BarbeirosPage({ searchParams }: BarbeirosPageProps) {
  const params = (await searchParams) ?? {};
  const barbers = await prisma.barber.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Barbeiros</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gerencie o time e os dados de contato dos profissionais.</p>
        </div>
        <a
          href="/dashboard/barbeiros/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-gray-900/20 transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <span className="text-base">+</span>
          Adicionar Novo
        </a>
      </header>

      {params.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">{params.error}</p>
      ) : null}

      {params.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
          {params.success}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Barbeiro</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Telefone</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {barbers.map((barber, index) => (
                <tr key={barber.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                          index % 2 === 0
                            ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {initials(barber.name)}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">{barber.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{barber.phone}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{barber.email ?? "-"}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{formatDate(barber.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
