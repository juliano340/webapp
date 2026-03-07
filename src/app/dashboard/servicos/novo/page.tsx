import Link from "next/link";
import { createServiceAction } from "@/app/dashboard/actions";

type NovoServicoPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

export default async function NovoServicoPage({ searchParams }: NovoServicoPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-black">Novo servico</h2>
          <p className="mt-1 text-sm text-zinc-500">Cadastre um servico no catalogo da barbearia.</p>
        </div>
        <Link
          href="/dashboard/servicos"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
        >
          Voltar
        </Link>
      </header>

      {params.error ? (
        <p className="rounded-lg border border-black bg-white px-4 py-3 text-sm text-black">{params.error}</p>
      ) : null}

      {params.success ? (
        <p className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-black">
          {params.success}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <form action={createServiceAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="errorPath" value="/dashboard/servicos/novo" />
          <input type="hidden" name="successPath" value="/dashboard/servicos" />

          <input
            name="name"
            placeholder="Nome do servico"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-black"
            required
          />
          <input
            name="priceInBRL"
            type="number"
            step="0.01"
            min="1"
            placeholder="Valor em R$"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-black"
            required
          />
          <textarea
            name="description"
            placeholder="Descricao"
            className="min-h-24 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-black md:col-span-2"
            required
          />
          <input
            name="durationInMinutes"
            type="number"
            min="5"
            step="5"
            placeholder="Duracao (min)"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-black"
            required
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Salvar servico
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
