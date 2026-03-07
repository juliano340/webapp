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
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Servicos</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure catalogo, valores e duracao dos atendimentos.</p>
        </div>
        <a
          href="/dashboard/servicos/novo"
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

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Servico</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Descricao</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Valor</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Duracao</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {services.map((service) => (
                <tr key={service.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{service.name}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{service.description}</td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatBRLFromCents(service.priceInCents)}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{service.durationInMinutes} min</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{formatDate(service.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
