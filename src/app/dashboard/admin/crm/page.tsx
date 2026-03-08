import Link from "next/link";
import { CrmReminderStatus, CrmRuleType } from "@prisma/client";
import { triggerCrmRemindersNowAction } from "./actions";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

type AdminCrmPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

function runStatusBadge(success: boolean): string {
  if (success) {
    return "border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  }

  return "border border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
}

function formatDateTime(date: Date): string {
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function AdminCrmPage({ searchParams }: AdminCrmPageProps) {
  const params = (await searchParams) ?? {};
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = addDays(dayStart, 1);
  const last30DaysStart = addDays(dayStart, -30);

  const [pendingToday, sentToday, failedToday, pendingOverdue, postServiceRule, birthdayRule, sentReminders30d, recentRuns] = await Promise.all([
    prisma.crmReminder.count({
      where: {
        status: CrmReminderStatus.PENDING,
        scheduledFor: { gte: dayStart, lt: dayEnd },
      },
    }),
    prisma.crmReminder.count({
      where: {
        status: CrmReminderStatus.SENT,
        scheduledFor: { gte: dayStart, lt: dayEnd },
      },
    }),
    prisma.crmReminder.count({
      where: {
        status: CrmReminderStatus.FAILED,
        scheduledFor: { gte: dayStart, lt: dayEnd },
      },
    }),
    prisma.crmReminder.count({
      where: {
        status: CrmReminderStatus.PENDING,
        scheduledFor: { lt: now },
      },
    }),
    prisma.crmAutomationRule.findUnique({ where: { type: CrmRuleType.POST_SERVICE } }),
    prisma.crmAutomationRule.findUnique({ where: { type: CrmRuleType.BIRTHDAY } }),
    prisma.crmReminder.findMany({
      where: {
        status: CrmReminderStatus.SENT,
        sentAt: { gte: last30DaysStart },
      },
      select: {
        id: true,
        clientId: true,
        sentAt: true,
      },
    }),
    prisma.crmJobRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        source: true,
        triggeredByEmail: true,
        startedAt: true,
        finishedAt: true,
        success: true,
        generatedPostService: true,
        generatedBirthday: true,
        errorMessage: true,
      },
    }),
  ]);

  const sentWithDate = sentReminders30d.filter((reminder) => reminder.sentAt !== null);
  const reminderClientIds = Array.from(new Set(sentWithDate.map((reminder) => reminder.clientId)));

  const appointmentsAfterReminders = reminderClientIds.length
    ? await prisma.appointment.findMany({
        where: {
          clientId: { in: reminderClientIds },
          createdAt: { gte: last30DaysStart },
        },
        select: {
          clientId: true,
          createdAt: true,
        },
      })
    : [];

  const appointmentsByClient = new Map<string, Date[]>();
  for (const appointment of appointmentsAfterReminders) {
    const list = appointmentsByClient.get(appointment.clientId) ?? [];
    list.push(appointment.createdAt);
    appointmentsByClient.set(appointment.clientId, list);
  }

  const convertedCount = sentWithDate.reduce((count, reminder) => {
    const sentAt = reminder.sentAt;
    if (!sentAt) return count;
    const conversionLimit = new Date(sentAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const list = appointmentsByClient.get(reminder.clientId) ?? [];
    const converted = list.some((createdAt) => createdAt >= sentAt && createdAt <= conversionLimit);
    return converted ? count + 1 : count;
  }, 0);

  const conversionRate = sentWithDate.length > 0 ? Math.round((convertedCount / sentWithDate.length) * 100) : 0;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">CRM</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Painel operacional de relacionamento e lembretes automáticos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={triggerCrmRemindersNowAction}>
            <input type="hidden" name="returnPath" value="/dashboard/admin/crm" />
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Gerar lembretes agora
            </button>
          </form>

          <Link
            href="/dashboard/admin"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Voltar ao Admin
          </Link>
        </div>
      </header>

      {params.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">{params.error}</p>
      ) : null}
      {params.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
          {params.success}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Pendentes hoje</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{pendingToday}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Enviados hoje</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{sentToday}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Falhas hoje</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{failedToday}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Pendentes atrasados</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{pendingOverdue}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Enviados (30d)</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{sentWithDate.length}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Conversao (30d)</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{conversionRate}%</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{convertedCount} de {sentWithDate.length} lembretes</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/admin/crm/automacoes"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Configuracao</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">Automacoes</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Pos-servico: {postServiceRule?.enabled ? "Ativo" : "Inativo"} · Aniversario: {birthdayRule?.enabled ? "Ativo" : "Inativo"}
          </p>
        </Link>

        <Link
          href="/dashboard/admin/crm/lembretes"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Operacao</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">Fila de lembretes</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Processar, enviar e auditar mensagens para clientes.</p>
        </Link>

        <Link
          href="/dashboard/admin/crm/segmentos"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Analise</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">Segmentos CRM</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Clientes sem retorno, alto valor e frequentes.</p>
        </Link>

        <Link
          href="/dashboard/admin/crm/canal-whatsapp"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Canal</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">WhatsApp integrado</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">QR Code, status de conexao e teste de envio direto no sistema.</p>
        </Link>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <header className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Historico de execucao CRM</h3>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Inicio</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Fim</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Origem</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Disparado por</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Gerados</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-gray-500 dark:text-gray-400">
                    Nenhuma execucao registrada ainda.
                  </td>
                </tr>
              ) : (
                recentRuns.map((run) => (
                  <tr key={run.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDateTime(run.startedAt)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{run.finishedAt ? formatDateTime(run.finishedAt) : "Em execucao"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{run.source}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{run.triggeredByEmail || "Sistema"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      Pos-servico: {run.generatedPostService} · Aniversario: {run.generatedBirthday}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${runStatusBadge(run.success)}`}>
                          {run.success ? "SUCCESS" : "FAILED"}
                        </span>
                        {run.errorMessage ? <p className="text-xs text-red-600 dark:text-red-400">{run.errorMessage}</p> : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
