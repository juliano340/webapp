import Link from "next/link";
import { AppointmentStatus } from "@prisma/client";
import { formatBRLFromCents } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export default async function CrmSegmentosPage() {
  const now = new Date();
  const sixtyDaysAgo = addDays(startOfDay(now), -60);

  const clients = await prisma.client.findMany({
    include: {
      appointments: {
        where: { status: AppointmentStatus.FINALIZADO },
        include: {
          service: { select: { priceInCents: true } },
          extraServices: { include: { service: { select: { priceInCents: true } } } },
        },
      },
    },
  });

  const noReturn = [] as Array<{ id: string; name: string; daysSince: number }>;
  const highValue = [] as Array<{ id: string; name: string; totalInCents: number }>;
  const frequent = [] as Array<{ id: string; name: string; count: number }>;

  for (const client of clients) {
    const finishedAppointments = client.appointments;
    if (finishedAppointments.length === 0) {
      continue;
    }

    const lastAppointment = finishedAppointments
      .map((item) => item.startsAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const daysSince = Math.floor((now.getTime() - lastAppointment.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSince >= 30) {
      noReturn.push({ id: client.id, name: client.name, daysSince });
    }

    const totalInCents = finishedAppointments.reduce((sum, appointment) => {
      const extraTotal = appointment.extraServices.reduce((extraSum, extra) => extraSum + extra.service.priceInCents, 0);
      return sum + appointment.service.priceInCents + extraTotal;
    }, 0);
    highValue.push({ id: client.id, name: client.name, totalInCents });

    const recentCount = finishedAppointments.filter((appointment) => appointment.startsAt >= sixtyDaysAgo).length;
    if (recentCount >= 3) {
      frequent.push({ id: client.id, name: client.name, count: recentCount });
    }
  }

  const topHighValue = highValue.sort((a, b) => b.totalInCents - a.totalInCents).slice(0, 10);
  const topNoReturn = noReturn.sort((a, b) => b.daysSince - a.daysSince).slice(0, 10);
  const topFrequent = frequent.sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Segmentos CRM</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Segmentos iniciais para campanhas e relacionamento ativo.
          </p>
        </div>
        <Link
          href="/dashboard/admin/crm"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Voltar ao CRM
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Sem retorno (30d+)</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{topNoReturn.length}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Alto valor (top 10)</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{topHighValue.length}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Frequentes (60d)</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{topFrequent.length}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Sem retorno</h3>
          <div className="mt-3 space-y-2">
            {topNoReturn.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum cliente neste segmento.</p>
            ) : (
              topNoReturn.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.daysSince} dias sem retornar</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Alto valor</h3>
          <div className="mt-3 space-y-2">
            {topHighValue.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum cliente neste segmento.</p>
            ) : (
              topHighValue.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receita total: {formatBRLFromCents(item.totalInCents)}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Frequentes</h3>
          <div className="mt-3 space-y-2">
            {topFrequent.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum cliente neste segmento.</p>
            ) : (
              topFrequent.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.count} atendimentos nos ultimos 60 dias</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </section>
  );
}
