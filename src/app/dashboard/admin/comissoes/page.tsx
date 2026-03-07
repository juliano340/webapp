import Link from "next/link";
import { AppointmentStatus } from "@prisma/client";
import {
  clearBarberCommissionRateAction,
  clearServiceCommissionRateAction,
  saveBarberCommissionRateAction,
  saveDefaultCommissionAction,
  saveServiceCommissionRateAction,
} from "./actions";
import { formatBRLFromCents } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PeriodKey = "day" | "week" | "month";

type ComissoesPageProps = {
  searchParams?: Promise<{ period?: string; date?: string; error?: string; success?: string }>;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPeriodRange(baseDate: Date, period: PeriodKey): { start: Date; end: Date; label: string; previousStart: Date; previousEnd: Date } {
  const day = startOfDay(baseDate);

  if (period === "day") {
    const start = day;
    const end = addDays(day, 1);
    return {
      start,
      end,
      label: `Dia ${day.toLocaleDateString("pt-BR")}`,
      previousStart: addDays(start, -1),
      previousEnd: start,
    };
  }

  if (period === "week") {
    const dow = day.getDay();
    const monday = addDays(day, dow === 0 ? -6 : 1 - dow);
    const end = addDays(monday, 7);
    return {
      start: monday,
      end,
      label: `Semana ${monday.toLocaleDateString("pt-BR")} - ${addDays(end, -1).toLocaleDateString("pt-BR")}`,
      previousStart: addDays(monday, -7),
      previousEnd: monday,
    };
  }

  const start = new Date(day.getFullYear(), day.getMonth(), 1);
  const end = new Date(day.getFullYear(), day.getMonth() + 1, 1);
  const previousStart = new Date(day.getFullYear(), day.getMonth() - 1, 1);
  return {
    start,
    end,
    label: day.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    previousStart,
    previousEnd: start,
  };
}

function formatPercentFromBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

type ReportResult = {
  revenueInCents: number;
  commissionInCents: number;
  barberMap: Map<string, { barberName: string; commissionInCents: number; revenueInCents: number }>;
};

export default async function AdminComissoesPage({ searchParams }: ComissoesPageProps) {
  const params = (await searchParams) ?? {};
  const period: PeriodKey = params.period === "week" || params.period === "month" ? params.period : "day";
  const parsedDate = params.date ? new Date(`${params.date}T00:00:00`) : new Date();
  const baseDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const { start, end, label, previousStart, previousEnd } = getPeriodRange(baseDate, period);

  const [settings, barbers, services, barberRates, serviceRates] = await Promise.all([
    prisma.commissionSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, defaultRateBps: 1000 },
    }),
    prisma.barber.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.barberCommissionRate.findMany(),
    prisma.serviceCommissionRate.findMany(),
  ]);

  const barberRateById = new Map(barberRates.map((item) => [item.barberId, item.rateBps]));
  const serviceRateById = new Map(serviceRates.map((item) => [item.serviceId, item.rateBps]));

  async function buildReport(rangeStart: Date, rangeEnd: Date): Promise<ReportResult> {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.FINALIZADO,
        startsAt: { gte: rangeStart, lt: rangeEnd },
      },
      include: {
        barber: { select: { id: true, name: true } },
        service: { select: { id: true, priceInCents: true } },
        extraServices: { include: { service: { select: { id: true, priceInCents: true } } } },
      },
    });

    const barberMap = new Map<string, { barberName: string; commissionInCents: number; revenueInCents: number }>();
    let revenueInCents = 0;
    let commissionInCents = 0;

    for (const appointment of appointments) {
      const barberRate = barberRateById.get(appointment.barber.id);
      const serviceLines = [appointment.service, ...appointment.extraServices.map((item) => item.service)];

      let appointmentRevenue = 0;
      let appointmentCommission = 0;

      for (const line of serviceLines) {
        const serviceRate = serviceRateById.get(line.id);
        const rateBps = barberRate ?? serviceRate ?? settings.defaultRateBps;
        appointmentRevenue += line.priceInCents;
        appointmentCommission += Math.round((line.priceInCents * rateBps) / 10000);
      }

      revenueInCents += appointmentRevenue;
      commissionInCents += appointmentCommission;

      const current = barberMap.get(appointment.barber.id) ?? {
        barberName: appointment.barber.name,
        commissionInCents: 0,
        revenueInCents: 0,
      };
      current.commissionInCents += appointmentCommission;
      current.revenueInCents += appointmentRevenue;
      barberMap.set(appointment.barber.id, current);
    }

    return { revenueInCents, commissionInCents, barberMap };
  }

  const [currentReport, previousReport] = await Promise.all([
    buildReport(start, end),
    buildReport(previousStart, previousEnd),
  ]);

  const deltaCommission = currentReport.commissionInCents - previousReport.commissionInCents;
  const periodDate = toDateKey(baseDate);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Comissionamento</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Defina regras de comissao e acompanhe valores a receber por barbeiro.
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

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Periodo</p>
          <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{label}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Receita finalizada</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{formatBRLFromCents(currentReport.revenueInCents)}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Comissao a pagar</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{formatBRLFromCents(currentReport.commissionInCents)}</p>
          <p className={`mt-1 text-xs font-semibold ${deltaCommission >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            Comparado ao periodo anterior: {deltaCommission >= 0 ? "+" : ""}{formatBRLFromCents(deltaCommission)}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <form className="grid gap-3 md:grid-cols-4">
          <select
            name="period"
            defaultValue={period}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          >
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
          </select>
          <input
            name="date"
            type="date"
            defaultValue={periodDate}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          />
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Atualizar relatorio
            </button>
            <Link
              href="/dashboard/admin/comissoes"
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Hoje
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Regra padrao</h3>
        <form action={saveDefaultCommissionAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="returnPath" value="/dashboard/admin/comissoes" />
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
            Percentual padrao
            <input
              name="ratePercent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={(settings.defaultRateBps / 100).toFixed(2)}
              className="mt-1 block rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Salvar
          </button>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Comissao por barbeiro</h3>
          <div className="mt-3 space-y-2">
            {barbers.map((barber) => {
              const rateBps = barberRateById.get(barber.id);
              const barberReport = currentReport.barberMap.get(barber.id);
              return (
                <div key={barber.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">{barber.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      A receber: <span className="font-semibold text-gray-900 dark:text-white">{formatBRLFromCents(barberReport?.commissionInCents ?? 0)}</span>
                    </p>
                  </div>
                  <form action={saveBarberCommissionRateAction} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="returnPath" value="/dashboard/admin/comissoes" />
                    <input type="hidden" name="barberId" value={barber.id} />
                    <input
                      name="ratePercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder={`Padrao (${formatPercentFromBps(settings.defaultRateBps)})`}
                      defaultValue={rateBps !== undefined ? (rateBps / 100).toFixed(2) : ""}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                    >
                      Salvar
                    </button>
                  </form>
                  {rateBps !== undefined ? (
                    <form action={clearBarberCommissionRateAction} className="mt-2">
                      <input type="hidden" name="returnPath" value="/dashboard/admin/comissoes" />
                      <input type="hidden" name="barberId" value={barber.id} />
                      <button type="submit" className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400">
                        Remover comissao especifica
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Comissao por servico</h3>
          <div className="mt-3 space-y-2">
            {services.map((service) => {
              const rateBps = serviceRateById.get(service.id);
              return (
                <div key={service.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="font-semibold text-gray-900 dark:text-white">{service.name}</p>
                  <form action={saveServiceCommissionRateAction} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="returnPath" value="/dashboard/admin/comissoes" />
                    <input type="hidden" name="serviceId" value={service.id} />
                    <input
                      name="ratePercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder={`Padrao (${formatPercentFromBps(settings.defaultRateBps)})`}
                      defaultValue={rateBps !== undefined ? (rateBps / 100).toFixed(2) : ""}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                    >
                      Salvar
                    </button>
                  </form>
                  {rateBps !== undefined ? (
                    <form action={clearServiceCommissionRateAction} className="mt-2">
                      <input type="hidden" name="returnPath" value="/dashboard/admin/comissoes" />
                      <input type="hidden" name="serviceId" value={service.id} />
                      <button type="submit" className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400">
                        Remover comissao especifica
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Comissao por barbeiro no periodo</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Barbeiro</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Receita</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Comissao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {Array.from(currentReport.barberMap.values()).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-5 text-gray-500 dark:text-gray-400">Sem atendimentos finalizados nesse periodo.</td>
                </tr>
              ) : (
                Array.from(currentReport.barberMap.values())
                  .sort((a, b) => b.commissionInCents - a.commissionInCents)
                  .map((row) => (
                    <tr key={row.barberName} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.barberName}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatBRLFromCents(row.revenueInCents)}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{formatBRLFromCents(row.commissionInCents)}</td>
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
