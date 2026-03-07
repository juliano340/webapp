import Link from "next/link";
import { createBarberAction } from "@/app/dashboard/actions";

type NovoBarbeiroPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

export default async function NovoBarbeiroPage({ searchParams }: NovoBarbeiroPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Novo barbeiro</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cadastre um profissional para atender na agenda.</p>
        </div>
        <Link
          href="/dashboard/barbeiros"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Voltar
        </Link>
      </header>

      {params.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">{params.error}</p>
      ) : null}

      {params.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
          {params.success}
        </p>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <form action={createBarberAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="errorPath" value="/dashboard/barbeiros/novo" />
          <input type="hidden" name="successPath" value="/dashboard/barbeiros" />

          <input
            name="name"
            placeholder="Nome"
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            required
          />
          <input
            name="phone"
            placeholder="Telefone"
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email (opcional)"
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200 md:col-span-2"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
                className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                Salvar barbeiro
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
