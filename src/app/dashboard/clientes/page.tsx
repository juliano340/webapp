import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type ClientesPageProps = {
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

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const params = (await searchParams) ?? {};
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Lista de Clientes</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gerencie os dados e historico dos clientes da barbearia.</p>
        </div>
        <a
          href="/dashboard/clientes/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-gray-900/20 transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <span className="text-base">+</span>
          Adicionar Novo
        </a>
      </header>

      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {params.error}
        </div>
      ) : null}

      {params.success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
          {params.success}
        </div>
      ) : null}

      {/* Search and Filters */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              placeholder="Pesquisar por nome, email ou telefone..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            />
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              Todos
            </button>
            <button className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              Recentes
            </button>
            <button className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              VIP
            </button>
          </div>
        </div>
      </section>

      {/* Clients Table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Nome</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Telefone</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Nascimento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {clients.map((client, index) => (
                <tr key={client.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                          index % 2 === 0 
                            ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" 
                            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {initials(client.name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{client.phone}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{formatDate(client.birthDate)}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{formatDate(client.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
