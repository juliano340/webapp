"use client";

import { FormEvent, useMemo, useState } from "react";

type CatalogService = {
  id: string;
  name: string;
  durationInMinutes: number;
  priceInCents: number;
};

type CatalogBarber = {
  id: string;
  name: string;
};

type BookingRequestItem = {
  id: string;
  status: string;
  requestedStartAt: string;
  requestedEndAt: string;
  statusReason: string | null;
  service: { name: string };
  barber: { name: string } | null;
};

type WorkingHours = {
  openingTime: string;
  closingTime: string;
};

function toMinutes(timeValue: string): number {
  const [hourPart, minutePart] = timeValue.split(":");
  return Number(hourPart) * 60 + Number(minutePart);
}

export default function AgendarPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [services, setServices] = useState<CatalogService[]>([]);
  const [barbers, setBarbers] = useState<CatalogBarber[]>([]);
  const [requests, setRequests] = useState<BookingRequestItem[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({ openingTime: "09:00", closingTime: "20:00" });

  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [notes, setNotes] = useState("");

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) || null,
    [services, serviceId],
  );

  async function loadPortalData() {
    const [catalogResponse, requestsResponse] = await Promise.all([
      fetch("/api/public/catalog"),
      fetch("/api/public/booking-requests"),
    ]);

    if (!catalogResponse.ok || !requestsResponse.ok) {
      throw new Error("Falha ao carregar dados do portal");
    }

    const catalogData = (await catalogResponse.json()) as {
      ok: boolean;
      services: CatalogService[];
      barbers: CatalogBarber[];
      workingHours?: WorkingHours;
    };
    const requestsData = (await requestsResponse.json()) as {
      ok: boolean;
      requests: BookingRequestItem[];
    };

    setServices(catalogData.services || []);
    setBarbers(catalogData.barbers || []);
    if (catalogData.workingHours) {
      setWorkingHours(catalogData.workingHours);
    }
    setRequests(requestsData.requests || []);
  }

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const response = await fetch("/api/public/auth/otp/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const data = (await response.json()) as { message?: string };
    setFeedback(data.message || "Se o numero for valido, enviamos um codigo via WhatsApp.");
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const response = await fetch("/api/public/auth/otp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setFeedback(data.error || "Codigo invalido ou expirado");
      return;
    }

    setIsAuthenticated(true);
    setFeedback("Login realizado com sucesso.");
    await loadPortalData();
  }

  async function handleCreateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService || !dateTime) {
      setFeedback("Selecione servico e horario.");
      return;
    }

    const start = new Date(dateTime);
    const end = new Date(start.getTime() + selectedService.durationInMinutes * 60 * 1000);
    const openingMinutes = toMinutes(workingHours.openingTime);
    const closingMinutes = toMinutes(workingHours.closingTime);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();

    if (start.toDateString() !== end.toDateString() || startMinutes < openingMinutes || endMinutes > closingMinutes) {
      setFeedback(
        `Horario fora de funcionamento. A barbearia atende de ${workingHours.openingTime} ate ${workingHours.closingTime}.`,
      );
      return;
    }

    const response = await fetch("/api/public/booking-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serviceId,
        barberId: barberId || null,
        requestedStartAt: start.toISOString(),
        requestedEndAt: end.toISOString(),
        notes,
      }),
    });

    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setFeedback(data.error || "Falha ao solicitar agendamento");
      return;
    }

    setFeedback("Solicitacao enviada. Aguarde aprovacao da barbearia.");
    setNotes("");
    await loadPortalData();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Agendamento via WhatsApp</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Entre com seu telefone, valide o codigo e solicite seu horario.
        </p>
      </header>

      {feedback ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          {feedback}
        </div>
      ) : null}

      {!isAuthenticated ? (
        <section className="grid gap-6 md:grid-cols-2">
          <form onSubmit={handleRequestOtp} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">1. Receber codigo</h2>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="5511999999999"
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
              required
            />
            <button className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
              Enviar codigo
            </button>
          </form>

          <form onSubmit={handleVerifyOtp} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">2. Validar codigo</h2>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="000000"
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
              required
            />
            <button className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
              Entrar
            </button>
          </form>
        </section>
      ) : (
        <>
          <form onSubmit={handleCreateRequest} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova solicitacao</h2>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                required
              >
                <option value="">Selecione um servico</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.durationInMinutes} min)
                  </option>
                ))}
              </select>

              <select
                value={barberId}
                onChange={(event) => setBarberId(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="">Sem preferencia de barbeiro</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                value={dateTime}
                onChange={(event) => setDateTime(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                required
              />

              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Observacoes (opcional)"
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Horario de funcionamento: {workingHours.openingTime} ate {workingHours.closingTime}.
            </p>

            <button className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
              Solicitar agendamento
            </button>
          </form>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Minhas solicitacoes</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {requests.length === 0 ? <li className="text-gray-500">Sem solicitações no momento.</li> : null}
              {requests.map((request) => (
                <li key={request.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {request.service.name} - {new Date(request.requestedStartAt).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">Status: {request.status}</p>
                  {request.barber ? <p className="text-gray-600 dark:text-gray-300">Barbeiro: {request.barber.name}</p> : null}
                  {request.statusReason ? <p className="text-red-500">Motivo: {request.statusReason}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
