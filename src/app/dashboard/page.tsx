import Link from "next/link";
import { AppointmentStatus } from "@prisma/client";
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

function statusForAppointment(status: AppointmentStatus): { label: string; className: string } {
  if (status === AppointmentStatus.CANCELADO) {
    return {
      label: "Cancelado",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
  }

  if (status === AppointmentStatus.FINALIZADO) {
    return {
      label: "Finalizado",
      className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    };
  }

  return {
    label: "Agendado",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getServiceSummary(appointment: {
  service: { name: string };
  extraServices: Array<{ service: { name: string } }>;
}): string {
  const names = [appointment.service.name, ...appointment.extraServices.map((item) => item.service.name)];
  if (names.length <= 1) {
    return names[0] ?? "Servico";
  }

  return `${names[0]} +${names.length - 1}`;
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
        extraServices: { include: { service: { select: { priceInCents: true } } } },
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
        extraServices: { include: { service: { select: { name: true } } } },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
  ]);

  const dailyRevenueInCents = appointmentsToday.reduce((total, appointment) => {
    const extraTotal = appointment.extraServices.reduce((sum, extra) => sum + extra.service.priceInCents, 0);
    return total + appointment.service.priceInCents + extraTotal;
  }, 0);

  const monthLabel = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  return (
    <section className="mx-auto w-full max-w-7xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Visao geral das atividades de hoje, {monthLabel}</p>
        </div>

        <Link
          href="/dashboard/agenda?view=day&new=1"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <span className="text-base">+</span>
          Novo Agendamento
        </Link>
      </header>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              AG
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">Hoje</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Agendamentos Hoje</p>
          <p className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{appointmentsToday.length}</p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              CL
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">Hoje</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Novos Clientes</p>
          <p className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{newClientsToday}</p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              R$
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              Diario
            </span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Receita Diaria</p>
          <p className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{formatBRLFromCents(dailyRevenueInCents)}</p>
        </article>
      </div>

      {/* Appointments Table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-900 dark:text-white">Proximos Agendamentos</h3>
          <Link href="/dashboard/agenda" className="text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            Ver Agenda Completa
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Horario</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Cliente</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Servico</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Barbeiro</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Abrir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {upcomingAppointments.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-gray-500 dark:text-gray-400" colSpan={6}>
                    Sem agendamentos futuros no momento.
                  </td>
                </tr>
              ) : (
                upcomingAppointments.map((appointment) => {
                  const status = statusForAppointment(appointment.status);
                  const timeLabel = appointment.startsAt.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{timeLabel}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{appointment.client.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{getServiceSummary(appointment)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{appointment.barber.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/agenda?view=day&date=${toDateKey(appointment.startsAt)}&edit=${appointment.id}`}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Abrir
                        </Link>
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
