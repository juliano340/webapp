"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OptionItem = {
  id: string;
  name: string;
};

type SearchableSelectProps = {
  options: OptionItem[];
  placeholder: string;
  query: string;
  selectedId: string;
  onQueryChange: (value: string) => void;
  onSelectId: (value: string) => void;
};

type ServiceMultiSelectProps = {
  options: OptionItem[];
  query: string;
  selectedIds: string[];
  onQueryChange: (value: string) => void;
  onToggle: (id: string) => void;
};

function SearchableSelect({
  options,
  placeholder,
  query,
  selectedId,
  onQueryChange,
  onSelectId,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return options.slice(0, 12);
    return options.filter((opt) => opt.name.toLowerCase().includes(value)).slice(0, 12);
  }, [options, query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const value = event.target.value;
          onQueryChange(value);
          const matched = options.find((opt) => opt.name.toLowerCase() === value.toLowerCase());
          onSelectId(matched?.id ?? "");
          setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
        required
      />

      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-gray-400 transition-colors hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-700"
        aria-label={`Alternar ${placeholder}`}
      >
        ▾
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">Nenhum resultado</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onQueryChange(item.name);
                  onSelectId(item.id);
                  setOpen(false);
                }}
                className={`block w-full rounded px-2 py-2 text-left text-sm transition ${
                  selectedId === item.id
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {item.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function ServiceMultiSelect({
  options,
  query,
  selectedIds,
  onQueryChange,
  onToggle,
}: ServiceMultiSelectProps) {
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return options;
    return options.filter((opt) => opt.name.toLowerCase().includes(value));
  }, [options, query]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar servicos"
        className="mb-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
      />

      <div className="max-h-44 space-y-1 overflow-auto pr-1">
        {filtered.length === 0 ? (
          <p className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">Nenhum servico encontrado.</p>
        ) : (
          filtered.map((service) => {
            const checked = selectedIds.includes(service.id);
            return (
              <label
                key={service.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  checked
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(service.id)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                {service.name}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

type NewAppointmentModalProps = {
  clients: OptionItem[];
  barbers: OptionItem[];
  services: OptionItem[];
  selectedDate: string;
  openingTime: string;
  closingTime: string;
  returnPath?: string;
  requireFutureConfirmation?: boolean;
  initialOpen?: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

function toMinutes(timeValue: string): number {
  const [hourPart, minutePart] = timeValue.split(":");
  return Number(hourPart) * 60 + Number(minutePart);
}

function clampTimeToOperatingRange(timeValue: string, openingTime: string, closingTime: string): string {
  const currentMinutes = toMinutes(timeValue);
  const openingMinutes = toMinutes(openingTime);
  const closingMinutes = toMinutes(closingTime);

  if (currentMinutes < openingMinutes || currentMinutes >= closingMinutes) {
    return openingTime;
  }

  return timeValue;
}

function isBeyondSevenDays(dateValue: string): boolean {
  if (!dateValue) return false;
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;

  const limit = new Date();
  limit.setHours(0, 0, 0, 0);
  limit.setDate(limit.getDate() + 7);
  return parsed.getTime() > limit.getTime();
}

function formatDatePtBr(dateValue: string): string {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function currentTimeKey(): string {
  const now = new Date();
  const hh = `${now.getHours()}`.padStart(2, "0");
  const mm = `${now.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

export function NewAppointmentModal({
  clients,
  barbers,
  services,
  selectedDate,
  openingTime,
  closingTime,
  returnPath = "/dashboard/agenda",
  requireFutureConfirmation = true,
  initialOpen = false,
  action,
}: NewAppointmentModalProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [open, setOpen] = useState(initialOpen);

  const [clientId, setClientId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const [clientQuery, setClientQuery] = useState("");
  const [barberQuery, setBarberQuery] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [dateValue, setDateValue] = useState(selectedDate);
  const [startTimeValue, setStartTimeValue] = useState(() =>
    clampTimeToOperatingRange(currentTimeKey(), openingTime, closingTime),
  );
  const [futureDateConfirmed, setFutureDateConfirmed] = useState(false);
  const [showFutureDateConfirm, setShowFutureDateConfirm] = useState(false);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener("keydown", onEscape);
      return () => window.removeEventListener("keydown", onEscape);
    }

    return undefined;
  }, [open]);

  const canSubmit = clientId !== "" && barberId !== "" && selectedServiceIds.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFutureDateConfirmed(false);
          setShowFutureDateConfirm(false);
          setDateValue(selectedDate);
          setStartTimeValue(clampTimeToOperatingRange(currentTimeKey(), openingTime, closingTime));
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
      >
        <span className="text-base">+</span>
        Novo
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => {
              setFutureDateConfirmed(false);
              setShowFutureDateConfirm(false);
              setOpen(false);
            }}
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar modal"
          />

          <section className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Novo agendamento</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Pesquise e selecione cliente, barbeiro e servico.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFutureDateConfirmed(false);
                  setShowFutureDateConfirm(false);
                  setOpen(false);
                }}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Fechar
              </button>
            </div>

            <form
              ref={formRef}
              action={action}
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                if (requireFutureConfirmation && !futureDateConfirmed && isBeyondSevenDays(dateValue)) {
                  event.preventDefault();
                  setShowFutureDateConfirm(true);
                }
              }}
            >
              <SearchableSelect
                options={clients}
                placeholder="Cliente"
                query={clientQuery}
                selectedId={clientId}
                onQueryChange={setClientQuery}
                onSelectId={setClientId}
              />

              <SearchableSelect
                options={barbers}
                placeholder="Barbeiro"
                query={barberQuery}
                selectedId={barberId}
                onQueryChange={setBarberQuery}
                onSelectId={setBarberId}
              />

              <div className="md:col-span-2">
                <ServiceMultiSelect
                  options={services}
                  query={serviceQuery}
                  selectedIds={selectedServiceIds}
                  onQueryChange={setServiceQuery}
                  onToggle={(id) => {
                    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
                  }}
                />
              </div>

              <input name="clientId" value={clientId} readOnly hidden />
              <input name="barberId" value={barberId} readOnly hidden />
              {selectedServiceIds.map((id) => (
                <input key={id} name="serviceIds" value={id} readOnly hidden />
              ))}
              <input name="status" value="AGENDADO" readOnly hidden />
              <input name="futureDateConfirmed" value={futureDateConfirmed ? "1" : "0"} readOnly hidden />
              <input name="returnPath" value={returnPath} readOnly hidden />

              <input
                name="date"
                type="date"
                value={dateValue}
                onChange={(event) => {
                  setDateValue(event.target.value);
                  setFutureDateConfirmed(false);
                  setShowFutureDateConfirm(false);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
                required
              />

              <input
                name="startTime"
                type="time"
                value={startTimeValue}
                onChange={(event) => setStartTimeValue(event.target.value)}
                min={openingTime}
                max={closingTime}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
                required
              />

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 dark:disabled:bg-gray-600"
                >
                  Salvar agendamento
                </button>
              </div>
            </form>

            {showFutureDateConfirm ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/35 p-4">
                <section className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                  <h4 className="text-base font-black tracking-tight text-gray-900 dark:text-white">Confirmar data do agendamento</h4>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Este agendamento sera marcado para <span className="font-semibold">{formatDatePtBr(dateValue)}</span>, acima de 7 dias.
                    Confirmar?
                  </p>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFutureDateConfirm(false)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFutureDateConfirmed(true);
                        setShowFutureDateConfirm(false);
                        setTimeout(() => {
                          formRef.current?.requestSubmit();
                        }, 0);
                      }}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                    >
                      Confirmar
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
