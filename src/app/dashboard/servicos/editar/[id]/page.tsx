import Link from "next/link";
import { notFound } from "next/navigation";
import { updateServiceAction } from "@/app/dashboard/actions";
import { formatBRLFromCents } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type EditarServicoPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
};

function toPriceInputValue(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2);
}

export default async function EditarServicoPage({ params, searchParams }: EditarServicoPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};

  const service = await prisma.service.findUnique({
    where: { id },
  });

  if (!service) {
    notFound();
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Editar servico</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Atualize nome, valor, descricao e duracao.</p>
        </div>
        <Link
          href="/dashboard/servicos"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Voltar
        </Link>
      </header>

      {query.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">{query.error}</p>
      ) : null}

      {query.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
          {query.success}
        </p>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <form action={updateServiceAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={service.id} />
          <input type="hidden" name="errorPath" value={`/dashboard/servicos/editar/${service.id}`} />
          <input type="hidden" name="successPath" value="/dashboard/servicos" />

          <input
            name="name"
            defaultValue={service.name}
            placeholder="Nome do servico"
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            required
          />
          <input
            name="priceInBRL"
            type="number"
            step="0.01"
            min="1"
            defaultValue={toPriceInputValue(service.priceInCents)}
            placeholder="Valor em R$"
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            required
          />
          <textarea
            name="description"
            defaultValue={service.description}
            placeholder="Descricao"
            className="min-h-24 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200 md:col-span-2"
            required
          />
          <input
            name="durationInMinutes"
            type="number"
            min="5"
            step="5"
            defaultValue={service.durationInMinutes}
            placeholder="Duracao (min)"
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            required
          />
          <div className="md:col-span-2">
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Valor atual: {formatBRLFromCents(service.priceInCents)}</p>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Salvar alteracoes
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
