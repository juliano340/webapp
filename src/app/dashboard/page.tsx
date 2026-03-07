import Link from "next/link";
import { formatBRLFromCents } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function getTodayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function statusForAppointment(startsAt: Date, endsAt: Date): { label: string; className: string } {
  const now = new Date();

  if (now >= startsAt && now <= endsAt) {
    return {
      label: "Em atendimento",
      className: "bg-amber-500/10 text-amber-600",
    };
  }

  if (startsAt > now) {
    return {
      label: "Confirmado",
      className: "bg-emerald-500/10 text-emerald-600",
    };
  }

  return {
    label: "Concluido",
    className: "bg-zinc-500/10 text-zinc-600",
  };
}

export default async function DashboardPage() {
  const { start, end } = getTodayRange();

  const [appointmentsToday, newClientsToday, upcomingAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: start, lte: end },
      },
      include: {
        service: { select: { priceInCents: true } },
      },
    }),
    prisma.client.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: start },
      },
      include: {
        client: { select: { name: true } },
        barber: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
  ]);

  const dailyRevenueInCents = appointmentsToday.reduce((total, appointment) => {
    return total + appointment.service.priceInCents;
  }, 0);

  const monthLabel = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  return (
    <section className="mx-auto w-full max-w-7xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">Visao geral das atividades de hoje, {monthLabel}</p>
        </div>

        <Link
          href="/dashboard/agenda?view=day&new=1"
          className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
        >
          <span className="text-base">+</span>
          Novo Agendamento
        </Link>
      </header>

      <div className="mb-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded-lg bg-black/5 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-black dark:bg-white/10 dark:text-white">
              AG
            </span>
            <span className="rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">Hoje</span>
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-slate-400">Agendamentos Hoje</p>
          <p className="mt-1 text-3xl font-black text-black dark:text-white">{appointmentsToday.length}</p>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded-lg bg-black/5 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-black dark:bg-white/10 dark:text-white">
              CL
            </span>
            <span className="rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">Hoje</span>
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-slate-400">Novos Clientes</p>
          <p className="mt-1 text-3xl font-black text-black dark:text-white">{newClientsToday}</p>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded-lg bg-black/5 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-black dark:bg-white/10 dark:text-white">
              R$
            </span>
            <span className="rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Diario
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-slate-400">Receita Diaria</p>
          <p className="mt-1 text-3xl font-black text-black dark:text-white">{formatBRLFromCents(dailyRevenueInCents)}</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-slate-700">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-black dark:text-white">Proximos Agendamentos</h3>
          <Link href="/dashboard/agenda" className="text-xs font-semibold text-black hover:underline dark:text-white">
            Ver Agenda Completa
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-slate-400">Horario</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-slate-400">Cliente</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-slate-400">Servico</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-slate-400">Barbeiro</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-slate-700">
              {upcomingAppointments.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-zinc-500 dark:text-slate-400" colSpan={5}>
                    Sem agendamentos futuros no momento.
                  </td>
                </tr>
              ) : (
                upcomingAppointments.map((appointment) => {
                  const status = statusForAppointment(appointment.startsAt, appointment.endsAt);
                  const timeLabel = appointment.startsAt.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={appointment.id} className="hover:bg-zinc-50 transition-colors dark:hover:bg-slate-800">
                      <td className="px-6 py-4 font-semibold text-black dark:text-white">{timeLabel}</td>
                      <td className="px-6 py-4 text-black dark:text-white">{appointment.client.name}</td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-slate-300">{appointment.service.name}</td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-slate-300">{appointment.barber.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
