import { formatBRLFromCents, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type ServicosPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

export default async function ServicosPage({ searchParams }: ServicosPageProps) {
  const params = (await searchParams) ?? {};
  const services = await prisma.service.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-black dark:text-white">Servicos</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">Configure catalogo, valores e duracao dos atendimentos.</p>
        </div>
        <a
          href="/dashboard/servicos/novo"
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

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-slate-400">Servico</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-slate-400">Descricao</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-slate-400">Valor</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-slate-400">Duracao</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-slate-400">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-slate-700">
              {services.map((service) => (
                <tr key={service.id} className="transition hover:bg-zinc-50/80 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 font-medium text-black dark:text-white">{service.name}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-slate-300">{service.description}</td>
                  <td className="px-6 py-4 text-zinc-700 dark:text-slate-200">{formatBRLFromCents(service.priceInCents)}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-slate-300">{service.durationInMinutes} min</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-slate-300">{formatDate(service.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
