import Link from "next/link";
import { CrmReminderStatus, CrmRuleType } from "@prisma/client";
import { triggerCrmDispatchNowAction, updateCrmReminderStatusAction } from "../actions";
import { prisma } from "@/lib/prisma";

type LembretesPageProps = {
  searchParams?: Promise<{
    status?: string;
    type?: string;
    from?: string;
    to?: string;
    error?: string;
    success?: string;
  }>;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function parseDateBoundary(value: string, kind: "from" | "to"): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }

  if (kind === "to") {
    parsed.setDate(parsed.getDate() + 1);
  }

  return parsed;
}

function statusBadge(status: CrmReminderStatus): string {
  if (status === CrmReminderStatus.SENT) {
    return "border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  }

  if (status === CrmReminderStatus.CANCELLED) {
    return "border border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
  }

  if (status === CrmReminderStatus.FAILED) {
    return "border border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
  }

  return "border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
}

function typeLabel(type: CrmRuleType): string {
  return type === CrmRuleType.BIRTHDAY ? "Aniversario" : "Pos-servico";
}

function buildReturnPath(params: { status?: string; type?: string; from?: string; to?: string }): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const encoded = query.toString();
  return encoded ? `/dashboard/admin/crm/lembretes?${encoded}` : "/dashboard/admin/crm/lembretes";
}

function toWhatsappLink(phone: string, message: string): string {
  const normalizedPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export default async function CrmLembretesPage({ searchParams }: LembretesPageProps) {
  const params = (await searchParams) ?? {};

  const status =
    params.status === CrmReminderStatus.PENDING ||
    params.status === CrmReminderStatus.SENT ||
    params.status === CrmReminderStatus.CANCELLED ||
    params.status === CrmReminderStatus.FAILED
      ? params.status
      : "";

  const type = params.type === CrmRuleType.BIRTHDAY || params.type === CrmRuleType.POST_SERVICE ? params.type : "";
  const fromDate = params.from ? parseDateBoundary(params.from, "from") : null;
  const toDateExclusive = params.to ? parseDateBoundary(params.to, "to") : null;

  const todayStart = startOfDay(new Date());
  const todayEnd = addDays(todayStart, 1);
  const returnPath = buildReturnPath(params);

  const [pendingToday, sentToday, failedToday, reminders] = await Promise.all([
    prisma.crmReminder.count({
      where: { status: CrmReminderStatus.PENDING, scheduledFor: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.crmReminder.count({
      where: { status: CrmReminderStatus.SENT, scheduledFor: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.crmReminder.count({
      where: { status: CrmReminderStatus.FAILED, scheduledFor: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.crmReminder.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(fromDate || toDateExclusive
          ? {
              scheduledFor: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDateExclusive ? { lt: toDateExclusive } : {}),
              },
            }
          : {}),
      },
      include: {
        client: { select: { name: true, phone: true } },
        appointment: {
          include: {
            barber: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { scheduledFor: "desc" },
      take: 300,
    }),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Lembretes CRM</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Processamento da fila de lembretes e registro de status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={triggerCrmDispatchNowAction}>
            <input type="hidden" name="returnPath" value={returnPath} />
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Processar pendentes agora
            </button>
          </form>

          <Link
            href="/dashboard/admin/crm"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Voltar ao CRM
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

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <form className="grid gap-3 md:grid-cols-4">
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          >
            <option value="">Todos status</option>
            <option value={CrmReminderStatus.PENDING}>PENDING</option>
            <option value={CrmReminderStatus.SENT}>SENT</option>
            <option value={CrmReminderStatus.CANCELLED}>CANCELLED</option>
            <option value={CrmReminderStatus.FAILED}>FAILED</option>
          </select>

          <select
            name="type"
            defaultValue={type}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          >
            <option value="">Todos tipos</option>
            <option value={CrmRuleType.POST_SERVICE}>POST_SERVICE</option>
            <option value={CrmRuleType.BIRTHDAY}>BIRTHDAY</option>
          </select>

          <input
            name="from"
            type="date"
            defaultValue={params.from ?? ""}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          />

          <input
            name="to"
            type="date"
            defaultValue={params.to ?? ""}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          />

          <div className="md:col-span-4 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Filtrar
            </button>
            <Link
              href="/dashboard/admin/crm/lembretes"
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Limpar
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Agendado para</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Tipo</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Cliente</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Mensagem</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {reminders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-gray-500 dark:text-gray-400">Sem lembretes para o filtro selecionado.</td>
                </tr>
              ) : (
                reminders.map((reminder) => (
                  <tr key={reminder.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {reminder.scheduledFor.toLocaleDateString("pt-BR")} {reminder.scheduledFor.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{typeLabel(reminder.type)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{reminder.client.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{reminder.client.phone || "Sem telefone"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{reminder.messageSnapshot}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(reminder.status)}`}>
                        {reminder.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/admin/crm/lembretes/${reminder.id}`}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Detalhes
                        </Link>

                        {reminder.client.phone.trim().length >= 8 ? (
                          <a
                            href={toWhatsappLink(reminder.client.phone, reminder.messageSnapshot)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            WhatsApp
                          </a>
                        ) : (
                          <span className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                            Sem telefone
                          </span>
                        )}

                        <form action={updateCrmReminderStatusAction}>
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <input type="hidden" name="reminderId" value={reminder.id} />
                          <input type="hidden" name="status" value={CrmReminderStatus.SENT} />
                          <button
                            type="submit"
                            className="rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                          >
                            Enviado
                          </button>
                        </form>

                        <form action={updateCrmReminderStatusAction}>
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <input type="hidden" name="reminderId" value={reminder.id} />
                          <input type="hidden" name="status" value={CrmReminderStatus.CANCELLED} />
                          <button
                            type="submit"
                            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            Cancelar
                          </button>
                        </form>

                        <form action={updateCrmReminderStatusAction}>
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <input type="hidden" name="reminderId" value={reminder.id} />
                          <input type="hidden" name="status" value={CrmReminderStatus.FAILED} />
                          <button
                            type="submit"
                            className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                          >
                            Falhou
                          </button>
                        </form>
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
