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
          <h2 className="text-3xl font-black tracking-tight text-black dark:text-white">Lista de Clientes</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">Gerencie os dados e historico dos clientes da barbearia.</p>
        </div>
        <a
          href="/dashboard/clientes/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
        >
          <span className="text-base">+</span>
          Adicionar Novo
        </a>
      </header>

      {params.error ? (
        <p className="rounded-lg border border-black bg-white px-4 py-3 text-sm text-black dark:border-slate-600 dark:bg-slate-800 dark:text-white">{params.error}</p>
      ) : null}

      {params.success ? (
        <p className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-black dark:border-slate-600 dark:bg-slate-800 dark:text-white">
          {params.success}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-slate-500">Q</span>
            <input
              placeholder="Pesquisar por nome, email ou telefone..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-black dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-white"
            />
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              Todos
            </button>
            <button className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              Recentes
            </button>
            <button className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              VIP
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-slate-400">Nome</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-slate-400">Telefone</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-slate-400">Nascimento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-slate-400">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-slate-700">
              {clients.map((client, index) => (
                <tr key={client.id} className="transition hover:bg-zinc-50/80 dark:hover:bg-slate-800">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                          index % 2 === 0 ? "bg-black/10 text-black dark:bg-white/10 dark:text-white" : "bg-zinc-200 text-zinc-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {initials(client.name)}
                      </div>
                      <div>
                        <p className="font-medium text-black dark:text-white">{client.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-slate-400">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-slate-300">{client.phone}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-slate-300">{formatDate(client.birthDate)}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-slate-300">{formatDate(client.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
