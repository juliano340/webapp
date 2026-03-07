import Link from "next/link";
import { saveAgendaRulesAction } from "./actions";
import { prisma } from "@/lib/prisma";

type AdminParametrosPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

export default async function AdminParametrosPage({ searchParams }: AdminParametrosPageProps) {
  const params = (await searchParams) ?? {};
  const settings = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, confirmFarFutureAppointmentEnabled: true },
  });

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Parametros do sistema</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Regras administrativas globais de operacao.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Voltar ao Admin
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

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Agenda e operacao</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Regras para validacao de datas e horarios na criacao/edicao de agendamentos.
        </p>

        <form action={saveAgendaRulesAction} className="mt-4 space-y-4">
          <input type="hidden" name="returnPath" value="/dashboard/admin/parametros" />

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <input
              type="checkbox"
              name="confirmFarFutureAppointmentEnabled"
              defaultChecked={settings.confirmFarFutureAppointmentEnabled}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                Solicitar confirmacao para agendamento acima de 7 dias
              </span>
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                Quando ativo, o usuario precisa confirmar explicitamente datas superiores a 7 dias a partir da data atual.
              </span>
            </span>
          </label>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
            Regra fixa adicional: o sistema nao permite agendamento em data/horario passado.
          </div>

          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Salvar parametros
          </button>
        </form>
      </section>
    </section>
  );
}
