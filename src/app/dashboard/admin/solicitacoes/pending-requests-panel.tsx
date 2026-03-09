"use client";

import { useState } from "react";

export type PendingRequest = {
  id: string;
  status: string;
  requestedStartAt: string;
  requestedEndAt: string;
  customer: { id: string; name: string | null; phoneE164: string };
  service: { id: string; name: string; durationInMinutes: number };
  barber: { id: string; name: string } | null;
};

type PendingRequestsPanelProps = {
  initialItems: PendingRequest[];
};

export function PendingRequestsPanel({ initialItems }: PendingRequestsPanelProps) {
  const [items, setItems] = useState<PendingRequest[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/booking-requests?status=PENDING", { cache: "no-store" });
    const data = (await response.json()) as { ok?: boolean; error?: string; requests?: PendingRequest[] };
    if (!response.ok || !data.ok) {
      setFeedback(data.error || "Falha ao carregar solicitacoes pendentes");
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(data.requests || []);
    setLoading(false);
  }

  async function approve(id: string, barberId?: string | null) {
    setFeedback(null);
    const response = await fetch(`/api/admin/booking-requests/${id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ barberId: barberId || undefined }),
    });

    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setFeedback(data.error || "Falha ao aprovar solicitacao");
      return;
    }

    setFeedback("Solicitacao aprovada com sucesso.");
    await load();
  }

  async function reject(id: string) {
    const reason = window.prompt("Informe o motivo da rejeicao:");
    if (!reason || reason.trim().length === 0) {
      return;
    }

    setFeedback(null);
    const response = await fetch(`/api/admin/booking-requests/${id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setFeedback(data.error || "Falha ao rejeitar solicitacao");
      return;
    }

    setFeedback("Solicitacao rejeitada.");
    await load();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Solicitacoes pendentes</h2>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Atualizar
        </button>
      </header>

      {feedback ? (
        <p className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {feedback}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-gray-500">Carregando...</p> : null}

      {!loading && items.length === 0 ? <p className="text-sm text-gray-500">Nenhuma solicitação pendente.</p> : null}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.service.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Cliente: {item.customer.name || "Sem nome"} ({item.customer.phoneE164})
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Horario: {new Date(item.requestedStartAt).toLocaleString("pt-BR")} ate {new Date(item.requestedEndAt).toLocaleTimeString("pt-BR")}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Barbeiro: {item.barber?.name || "Sem preferencia"}</p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void approve(item.id, item.barber?.id)}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-emerald-500"
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={() => void reject(item.id)}
                className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                Rejeitar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
