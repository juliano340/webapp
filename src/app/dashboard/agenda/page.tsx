import Link from "next/link";
import { AppointmentStatus } from "@prisma/client";
import { createAppointmentAction, deleteAppointmentAction, updateAppointmentAction } from "@/app/dashboard/actions";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { CurrentTimeLine } from "./current-time-line";
import { EditAppointmentModal } from "./edit-appointment-modal";
import { NewAppointmentModal } from "./new-appointment-modal";

type AgendaView = "day" | "week" | "month";

type AgendaPageProps = {
  searchParams?: Promise<{ view?: string; date?: string; error?: string; success?: string; new?: string; edit?: string }>;
};

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINUTES = 60;
const ROW_HEIGHT = 84;
const TIME_COLUMN_WIDTH = 80;

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

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function minutesFromStart(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() - START_HOUR * 60;
}

function toTimeKey(date: Date): string {
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

function statusTone(status: AppointmentStatus): { badge: string; label: string } {
  if (status === AppointmentStatus.CANCELADO) {
    return {
      badge: "border border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
      label: "Cancelado",
    };
  }

  if (status === AppointmentStatus.FINALIZADO) {
    return {
      badge: "border border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200",
      label: "Finalizado",
    };
  }

  return {
    badge: "border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    label: "Agendado",
  };
}

const MINI_CARD_TONES = [
  { card: "border-sky-200 bg-sky-50", name: "text-sky-900", meta: "text-sky-700", dot: "bg-sky-500" },
  { card: "border-emerald-200 bg-emerald-50", name: "text-emerald-900", meta: "text-emerald-700", dot: "bg-emerald-500" },
  { card: "border-amber-200 bg-amber-50", name: "text-amber-900", meta: "text-amber-700", dot: "bg-amber-500" },
  { card: "border-violet-200 bg-violet-50", name: "text-violet-900", meta: "text-violet-700", dot: "bg-violet-500" },
  { card: "border-rose-200 bg-rose-50", name: "text-rose-900", meta: "text-rose-700", dot: "bg-rose-500" },
] as const;

function toneBySeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return MINI_CARD_TONES[Math.abs(hash) % MINI_CARD_TONES.length];
}

function getRange(date: Date, view: AgendaView): { start: Date; end: Date; days: Date[] } {
  const day = startOfDay(date);

  if (view === "day") {
    return { start: day, end: addDays(day, 1), days: [day] };
  }

  if (view === "week") {
    const dow = day.getDay();
    const monday = addDays(day, dow === 0 ? -6 : 1 - dow);

    return {
      start: monday,
      end: addDays(monday, 7),
      days: Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    };
  }

  const first = new Date(day.getFullYear(), day.getMonth(), 1);
  const next = new Date(day.getFullYear(), day.getMonth() + 1, 1);
  const count = Math.round((next.getTime() - first.getTime()) / 86400000);

  return {
    start: first,
    end: next,
    days: Array.from({ length: count }, (_, i) => addDays(first, i)),
  };
}

function relativeDayLabel(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return "Data selecionada";
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = (await searchParams) ?? {};
  const view: AgendaView =
    params.view === "week" || params.view === "month" || params.view === "day" ? params.view : "day";

  const parsed = params.date ? new Date(`${params.date}T00:00:00`) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const dateKey = toDateKey(safeDate);
  const { start, end, days } = getRange(safeDate, view);

  const [clients, services, barbers, appointments] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.barber.findMany({ orderBy: { name: "asc" } }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: start, lt: end } },
      include: { client: true, service: true, barber: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const apptByDay = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = toDateKey(appointment.startsAt);
    const list = apptByDay.get(key) ?? [];
    list.push(appointment);
    apptByDay.set(key, list);
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const gridHeight = (((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES) * ROW_HEIGHT;

  const prevDate = toDateKey(addDays(safeDate, view === "month" ? -30 : view === "week" ? -7 : -1));
  const nextDate = toDateKey(addDays(safeDate, view === "month" ? 30 : view === "week" ? 7 : 1));
  const todayDate = toDateKey(new Date());
  const isOnToday = dateKey === todayDate;
  const agendaPath = `/dashboard/agenda?view=${view}&date=${dateKey}`;
  const editingId = typeof params.edit === "string" ? params.edit : "";
  const editingAppointment = appointments.find((appointment) => appointment.id === editingId) ?? null;
  const editableAppointment = editingAppointment
    ? {
        id: editingAppointment.id,
        clientId: editingAppointment.client.id,
        clientName: editingAppointment.client.name,
        barberId: editingAppointment.barber.id,
        barberName: editingAppointment.barber.name,
        serviceId: editingAppointment.service.id,
        serviceName: editingAppointment.service.name,
        date: toDateKey(editingAppointment.startsAt),
        startTime: toTimeKey(editingAppointment.startsAt),
        status: editingAppointment.status,
      }
    : null;

  const currentLabel =
    view === "day"
      ? `${relativeDayLabel(safeDate)} · ${safeDate.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}`
      : view === "week"
        ? `Semana: ${days[0]?.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} - ${days[days.length - 1]?.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
        : safeDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <section className="mx-auto flex h-[calc(100vh-8.5rem)] w-full max-w-7xl flex-col gap-4 overflow-hidden">
      {params.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">{params.error}</p>
      ) : null}
      {params.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
          {params.success}
        </p>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Agenda</h2>

          <div className="flex items-center gap-2">
            <NewAppointmentModal
              clients={clients.map((c) => ({ id: c.id, name: c.name }))}
              barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
              services={services.map((s) => ({ id: s.id, name: s.name }))}
              selectedDate={dateKey}
              initialOpen={params.new === "1"}
              action={createAppointmentAction}
              returnPath={agendaPath}
            />

            <EditAppointmentModal
              key={editingAppointment?.id ?? "no-edit"}
              clients={clients.map((c) => ({ id: c.id, name: c.name }))}
              barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
              services={services.map((s) => ({ id: s.id, name: s.name }))}
              appointment={editableAppointment}
              returnPath={agendaPath}
              initialOpen={editingAppointment !== null}
              action={updateAppointmentAction}
              deleteAction={deleteAppointmentAction}
            />

            <div className="flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              {([
                { key: "day", label: "Dia" },
                { key: "week", label: "Semana" },
                { key: "month", label: "Mes" },
              ] as const).map((item) => (
                <Link
                  key={item.key}
                  href={`/dashboard/agenda?view=${item.key}&date=${dateKey}`}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    view === item.key
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
              <Link
                href={`/dashboard/agenda?view=${view}&date=${prevDate}`}
                className="px-3 py-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                ←
              </Link>
              <span className="border-l border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                {currentLabel}
              </span>
              <Link
                href={`/dashboard/agenda?view=${view}&date=${nextDate}`}
                className="border-l border-gray-200 px-3 py-2 text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                →
              </Link>
            </div>

            <Link
              href={`/dashboard/agenda?view=${view}&date=${todayDate}`}
              aria-disabled={isOnToday}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                isOnToday
                  ? "pointer-events-none border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                  : "border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              Hoje
            </Link>
          </div>
        </div>

        {view === "day" ? (
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
            <div className="min-w-[980px]">
              <div className="grid bg-gray-50 dark:bg-gray-800/50" style={{ gridTemplateColumns: `80px repeat(${Math.max(barbers.length, 1)}, minmax(180px, 1fr))` }}>
                <div className="border-r border-gray-200 p-3 dark:border-gray-700" />
                {barbers.map((b) => (
                  <div key={b.id} className="border-r border-gray-200 p-3 last:border-r-0 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">{initials(b.name)}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.name}</p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Barbeiro</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative flex" style={{ height: `${gridHeight}px` }}>
                <div className="w-20 shrink-0 border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  {hours.map((h) => (
                    <div key={h} className="border-b border-gray-200 px-2 pt-2 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400" style={{ height: `${ROW_HEIGHT}px` }}>
                      {`${String(h).padStart(2, "0")}:00`}
                    </div>
                  ))}
                </div>

                <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${Math.max(barbers.length, 1)}, minmax(180px, 1fr))` }}>
                  {barbers.map((b) => {
                    const bApps = appointments.filter((a) => a.barber.id === b.id);

                    return (
                      <div key={b.id} className="relative border-r border-gray-200 last:border-r-0 dark:border-gray-700">
                        {hours.map((h) => (
                          <div key={`${b.id}-${h}`} className="border-b border-gray-200 dark:border-gray-700" style={{ height: `${ROW_HEIGHT}px` }} />
                        ))}

                        {bApps.map((a) => {
                          const top = (minutesFromStart(a.startsAt) / SLOT_MINUTES) * ROW_HEIGHT;
                          const duration = (a.endsAt.getTime() - a.startsAt.getTime()) / 60000;
                          const height = Math.max((duration / SLOT_MINUTES) * ROW_HEIGHT - 6, 34);
                          const tone = toneBySeed(a.barber.id);
                          const status = statusTone(a.status);

                          return (
                            <Link
                              key={a.id}
                              href={`${agendaPath}&edit=${a.id}`}
                              className={`absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1.5 text-xs leading-tight shadow-sm transition-transform hover:-translate-y-0.5 ${tone.card}`}
                              style={{ top: `${top + 3}px`, height: `${height}px` }}
                              title="Clique para editar"
                            >
                              <p className={`text-xs font-semibold leading-tight ${tone.name}`}>{a.client.name}</p>
                              <p className={`text-[11px] leading-tight ${tone.meta}`}>{a.service.name}</p>
                              <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${status.badge}`}>
                                {status.label}
                              </span>
                              <p className={`mt-1 text-[10px] leading-tight ${tone.meta}`}>
                                {a.startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {a.endsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                <CurrentTimeLine selectedDate={dateKey} startHour={START_HOUR} endHour={END_HOUR} slotMinutes={SLOT_MINUTES} rowHeight={ROW_HEIGHT} timeColumnWidthPx={TIME_COLUMN_WIDTH} />
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto space-y-3">
            {barbers.length > 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                  Legenda por barbeiro
                </p>
                <div className="flex flex-wrap gap-2">
                  {barbers.map((barber) => {
                    const tone = toneBySeed(barber.id);
                    return (
                      <span
                        key={barber.id}
                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${tone.card} ${tone.name}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                        {barber.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-7">
              {days.map((d) => {
                const key = toDateKey(d);
                const list = apptByDay.get(key) ?? [];
                const isTodayCard = key === todayDate;

                return (
                  <div
                    key={key}
                    className={`min-h-24 rounded-lg border p-2 transition-colors ${
                      isTodayCard
                        ? "border-sky-300 bg-sky-50 ring-1 ring-sky-200 dark:border-sky-700 dark:bg-sky-900/20 dark:ring-sky-800"
                        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isTodayCard ? "text-sky-700 dark:text-sky-300" : "text-gray-500 dark:text-gray-400"}`}>
                        {formatDate(d)}
                      </p>
                      {isTodayCard ? (
                        <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white dark:bg-sky-500">
                          Hoje
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {list.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Sem horarios</p>
                      ) : (
                        list.slice(0, 4).map((a) => {
                          const tone = toneBySeed(a.barber.id);
                          const status = statusTone(a.status);

                          return (
                            <Link
                              key={a.id}
                              href={`${agendaPath}&edit=${a.id}`}
                              className={`block rounded-md border px-2 py-1 text-xs transition-transform hover:-translate-y-0.5 ${tone.card}`}
                              title="Clique para editar"
                            >
                              <p className={`font-medium ${tone.name}`}>{a.client.name}</p>
                              <p className={tone.meta}>
                                {a.barber.name} · {a.startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              <span className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${status.badge}`}>
                                {status.label}
                              </span>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Exibicao harmonizada entre Dia, Semana e Mes. Intervalo atual: {SLOT_MINUTES} min (parametrizavel).
        </p>
      </section>
    </section>
  );
}
