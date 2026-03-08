import Link from "next/link";
import { CrmRuleType } from "@prisma/client";
import { saveCrmRuleAction } from "../actions";
import { prisma } from "@/lib/prisma";

type AutomacoesPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

export default async function CrmAutomacoesPage({ searchParams }: AutomacoesPageProps) {
  const params = (await searchParams) ?? {};

  const [postServiceRule, birthdayRule] = await Promise.all([
    prisma.crmAutomationRule.upsert({
      where: { type: CrmRuleType.POST_SERVICE },
      update: {},
      create: {
        type: CrmRuleType.POST_SERVICE,
        enabled: true,
        daysAfterService: 14,
        template:
          "Oi {nome}, tudo bem? Ja faz {dias} dias do seu {servico} com {barbeiro}. Estamos a disposicao para manutencao na {barbearia}.",
      },
    }),
    prisma.crmAutomationRule.upsert({
      where: { type: CrmRuleType.BIRTHDAY },
      update: {},
      create: {
        type: CrmRuleType.BIRTHDAY,
        enabled: true,
        daysAfterService: null,
        template:
          "Feliz aniversario, {nome}! A equipe da {barbearia} te deseja um dia incrivel. Conte com a gente para seu proximo atendimento.",
      },
    }),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Automacoes CRM</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ative regras de relacionamento e ajuste templates de mensagem.
          </p>
        </div>
        <Link
          href="/dashboard/admin/crm"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Voltar ao CRM
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

      <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Pos-servico</h3>
        <form action={saveCrmRuleAction} className="mt-4 space-y-3">
          <input type="hidden" name="returnPath" value="/dashboard/admin/crm/automacoes" />
          <input type="hidden" name="type" value={CrmRuleType.POST_SERVICE} />

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={postServiceRule.enabled}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Ativar lembrete automatico pos-servico</span>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
            Dias apos atendimento finalizado
            <input
              name="daysAfterService"
              type="number"
              min="1"
              max="120"
              defaultValue={postServiceRule.daysAfterService ?? 14}
              className="mt-1 block rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
            Template
            <textarea
              name="template"
              defaultValue={postServiceRule.template}
              className="mt-1 min-h-28 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            />
          </label>

          <p className="text-xs text-gray-500 dark:text-gray-400">Placeholders: {"{nome}"}, {"{servico}"}, {"{barbeiro}"}, {"{dias}"}, {"{barbearia}"}</p>

          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Salvar regra
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Aniversario</h3>
        <form action={saveCrmRuleAction} className="mt-4 space-y-3">
          <input type="hidden" name="returnPath" value="/dashboard/admin/crm/automacoes" />
          <input type="hidden" name="type" value={CrmRuleType.BIRTHDAY} />

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={birthdayRule.enabled}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Ativar lembrete automatico de aniversario</span>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
            Template
            <textarea
              name="template"
              defaultValue={birthdayRule.template}
              className="mt-1 min-h-28 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            />
          </label>

          <p className="text-xs text-gray-500 dark:text-gray-400">Placeholders: {"{nome}"}, {"{barbearia}"}</p>

          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Salvar regra
          </button>
        </form>
      </article>
    </section>
  );
}
