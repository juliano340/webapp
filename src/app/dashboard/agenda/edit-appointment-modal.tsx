"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type OptionItem = {
  id: string;
  name: string;
};

type EditableAppointment = {
  id: string;
  clientId: string;
  clientName: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  startTime: string;
  status: "AGENDADO" | "CANCELADO" | "FINALIZADO";
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

type EditAppointmentModalProps = {
  clients: OptionItem[];
  barbers: OptionItem[];
  services: OptionItem[];
  appointment: EditableAppointment | null;
  returnPath: string;
  initialOpen?: boolean;
  action: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export function EditAppointmentModal({
  clients,
  barbers,
  services,
  appointment,
  returnPath,
  initialOpen = false,
  action,
  deleteAction,
}: EditAppointmentModalProps) {
  const router = useRouter();
  const isOpen = initialOpen && appointment !== null;

  const [clientId, setClientId] = useState(appointment?.clientId ?? "");
  const [barberId, setBarberId] = useState(appointment?.barberId ?? "");
  const [serviceId, setServiceId] = useState(appointment?.serviceId ?? "");

  const [clientQuery, setClientQuery] = useState(appointment?.clientName ?? "");
  const [barberQuery, setBarberQuery] = useState(appointment?.barberName ?? "");
  const [serviceQuery, setServiceQuery] = useState(appointment?.serviceName ?? "");
  const [status, setStatus] = useState(appointment?.status ?? "AGENDADO");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(returnPath);
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", onEscape);
      return () => window.removeEventListener("keydown", onEscape);
    }

    return undefined;
  }, [isOpen, returnPath, router]);

  if (!appointment || !isOpen) {
    return null;
  }

  const canSubmit = clientId !== "" && barberId !== "" && serviceId !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={() => router.push(returnPath)}
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar modal"
      />

      <section className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Editar agendamento</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Atualize cliente, barbeiro, servico e horario.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(returnPath)}
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

          <input name="appointmentId" value={appointment.id} readOnly hidden />
          <input name="returnPath" value={returnPath} readOnly hidden />
          <input name="clientId" value={clientId} readOnly hidden />
          <input name="barberId" value={barberId} readOnly hidden />
          <input name="serviceId" value={serviceId} readOnly hidden />
          <input name="status" value={status} readOnly hidden />

          <input
            name="date"
            type="date"
            defaultValue={appointment.date}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            required
          />

          <input
            name="startTime"
            type="time"
            defaultValue={appointment.startTime}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            required
          />

          <select
            value={status}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "AGENDADO" || value === "CANCELADO" || value === "FINALIZADO") {
                setStatus(value);
              }
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          >
            <option value="AGENDADO">Agendado</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="FINALIZADO">Finalizado</option>
          </select>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Excluir agendamento
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 dark:disabled:bg-gray-600"
              >
                Salvar alteracoes
              </button>
            </div>
          </div>
        </form>

        {confirmDelete ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/35 p-4">
            <section className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
              <h4 className="text-base font-black tracking-tight text-gray-900 dark:text-white">Confirmar exclusao</h4>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Deseja excluir este agendamento? Esta acao nao pode ser desfeita.
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <form action={deleteAction}>
                  <input type="hidden" name="id" value={appointment.id} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <button
                    type="submit"
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Confirmar
                  </button>
                </form>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
