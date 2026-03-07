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

type NewAppointmentModalProps = {
  clients: OptionItem[];
  barbers: OptionItem[];
  services: OptionItem[];
  selectedDate: string;
  returnPath?: string;
  initialOpen?: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

export function NewAppointmentModal({
  clients,
  barbers,
  services,
  selectedDate,
  returnPath = "/dashboard/agenda",
  initialOpen = false,
  action,
}: NewAppointmentModalProps) {
  const [open, setOpen] = useState(initialOpen);

  const [clientId, setClientId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [serviceId, setServiceId] = useState("");

  const [clientQuery, setClientQuery] = useState("");
  const [barberQuery, setBarberQuery] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");

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

  const canSubmit = clientId !== "" && barberId !== "" && serviceId !== "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
      >
        <span className="text-base">+</span>
        Novo
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
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
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Fechar
              </button>
            </div>

            <form action={action} className="grid gap-3 md:grid-cols-2">
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
                <SearchableSelect
                  options={services}
                  placeholder="Servico"
                  query={serviceQuery}
                  selectedId={serviceId}
                  onQueryChange={setServiceQuery}
                  onSelectId={setServiceId}
                />
              </div>

              <input name="clientId" value={clientId} readOnly hidden />
              <input name="barberId" value={barberId} readOnly hidden />
              <input name="serviceId" value={serviceId} readOnly hidden />
              <input name="returnPath" value={returnPath} readOnly hidden />

              <input
                name="date"
                type="date"
                defaultValue={selectedDate}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
                required
              />

              <input
                name="startTime"
                type="time"
                defaultValue="09:00"
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
          </section>
        </div>
      ) : null}
    </>
  );
}
