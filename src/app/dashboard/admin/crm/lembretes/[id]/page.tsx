import Link from "next/link";
import { notFound } from "next/navigation";
import { CrmRuleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ReminderDetailPageProps = {
  params: Promise<{ id: string }>;
};

function typeLabel(type: CrmRuleType): string {
  return type === CrmRuleType.BIRTHDAY ? "Aniversario" : "Pos-servico";
}

export default async function ReminderDetailPage({ params }: ReminderDetailPageProps) {
  const { id } = await params;

  const reminder = await prisma.crmReminder.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      appointment: {
        include: {
          barber: { select: { name: true } },
          service: { select: { name: true } },
        },
      },
      events: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!reminder) {
    notFound();
  }

  const conversionLimit = reminder.sentAt ? new Date(reminder.sentAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const convertedAppointment = reminder.sentAt
    ? await prisma.appointment.findFirst({
        where: {
          clientId: reminder.client.id,
          createdAt: {
            gte: reminder.sentAt,
            ...(conversionLimit ? { lte: conversionLimit } : {}),
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : null;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Detalhe do lembrete</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ID: {reminder.id}</p>
        </div>
        <Link
          href="/dashboard/admin/crm/lembretes"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Voltar aos lembretes
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Cliente</p>
          <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{reminder.client.name}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{reminder.client.phone || "Sem telefone"}</p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Tipo</p>
          <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{typeLabel(reminder.type)}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Status: {reminder.status}</p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Conversao (30 dias)</p>
          <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{convertedAppointment ? "Convertido" : "Nao convertido"}</p>
          {convertedAppointment ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Agendamento: {convertedAppointment.id}</p>
          ) : null}
        </article>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Mensagem</h3>
        <p className="mt-3 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
          {reminder.messageSnapshot}
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Timeline de eventos</h3>
        <div className="mt-3 space-y-2">
          {reminder.events.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Sem eventos registrados.</p>
          ) : (
            reminder.events.map((event) => (
              <article key={event.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{event.action}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {event.createdAt.toLocaleDateString("pt-BR")} {event.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{event.actorEmail || "Sistema"}</p>
                {event.details ? <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{event.details}</p> : null}
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
