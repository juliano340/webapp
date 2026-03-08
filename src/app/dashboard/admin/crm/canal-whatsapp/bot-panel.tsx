"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type BotState = {
  status: "IDLE" | "INITIALIZING" | "QR_CODE" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  sessionName: string;
  qrCodeDataUrl: string | null;
  lastError: string | null;
  updatedAt: string;
};

function statusBadge(status: BotState["status"]): string {
  if (status === "CONNECTED") {
    return "border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  }

  if (status === "ERROR") {
    return "border border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
  }

  if (status === "QR_CODE") {
    return "border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
  }

  return "border border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
}

export function BotPanel() {
  const [state, setState] = useState<BotState | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Teste de envio do CRM.");

  async function refreshStatus() {
    setLoadingStatus(true);
    try {
      const response = await fetch("/api/internal/whatsapp/status", { cache: "no-store" });
      const data = (await response.json()) as { ok: boolean; state?: BotState; error?: string };

      if (!response.ok || !data.ok || !data.state) {
        throw new Error(data.error || "Falha ao carregar status do bot");
      }

      setState(data.state);
      setError(null);
    } catch (requestError) {
      const messageText = requestError instanceof Error ? requestError.message : "Falha ao carregar status";
      setError(messageText);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function connectBot() {
    setActionLoading(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch("/api/internal/whatsapp/connect", {
        method: "POST",
      });

      const data = (await response.json()) as { ok: boolean; state?: BotState; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Falha ao conectar bot");
      }

      if (data.state) {
        setState(data.state);
      }

      setFeedback("Solicitacao de conexao iniciada. Escaneie o QR code quando aparecer.");
    } catch (requestError) {
      const messageText = requestError instanceof Error ? requestError.message : "Falha ao conectar";
      setError(messageText);
    } finally {
      setActionLoading(false);
    }
  }

  async function resetSession() {
    setActionLoading(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch("/api/internal/whatsapp/reset", {
        method: "POST",
      });

      const data = (await response.json()) as { ok: boolean; state?: BotState; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Falha ao resetar sessao do bot");
      }

      if (data.state) {
        setState(data.state);
      }

      setFeedback("Sessao resetada. Clique em Conectar bot para gerar novo QR Code.");
    } catch (requestError) {
      const messageText = requestError instanceof Error ? requestError.message : "Falha ao resetar sessao";
      setError(messageText);
    } finally {
      setActionLoading(false);
    }
  }

  async function sendTestMessage() {
    setActionLoading(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch("/api/internal/whatsapp/send-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, message }),
      });

      const data = (await response.json()) as { ok: boolean; providerMessageId?: string | null; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Falha ao enviar mensagem de teste");
      }

      setFeedback(data.providerMessageId ? `Mensagem enviada. ID: ${data.providerMessageId}` : "Mensagem enviada com sucesso.");
      await refreshStatus();
    } catch (requestError) {
      const messageText = requestError instanceof Error ? requestError.message : "Falha ao enviar teste";
      setError(messageText);
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    void refreshStatus();

    const interval = setInterval(() => {
      void refreshStatus();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const qrCode = useMemo(() => {
    if (!state?.qrCodeDataUrl) return null;
    return state.qrCodeDataUrl;
  }, [state?.qrCodeDataUrl]);

  return (
    <section className="flex flex-col gap-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Status do bot</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">Canal WhatsApp integrado</h3>
          </div>

          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(state?.status || "IDLE")}`}>
            {state?.status || "IDLE"}
          </span>
        </div>

        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Sessao: <span className="font-semibold text-gray-900 dark:text-white">{state?.sessionName || "crm-whatsapp"}</span>
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Ultima atualizacao: {state?.updatedAt ? new Date(state.updatedAt).toLocaleString("pt-BR") : "-"}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          No modo headless, o navegador nao abre visualmente. O QR aparece aqui apenas quando a sessao exigir novo pareamento.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={connectBot}
            disabled={actionLoading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-70 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Conectar bot
          </button>
          <button
            type="button"
            onClick={() => void refreshStatus()}
            disabled={loadingStatus}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-70 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Atualizar status
          </button>
          <button
            type="button"
            onClick={() => void resetSession()}
            disabled={actionLoading}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-70 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
          >
            Resetar sessao
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</p>
        ) : null}
        {feedback ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            {feedback}
          </p>
        ) : null}
        {state?.lastError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            Ultimo erro: {state.lastError}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">QR Code</p>
          <h4 className="mt-2 text-lg font-black tracking-tight text-gray-900 dark:text-white">Parear WhatsApp</h4>

          <div className="mt-4 flex min-h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            {qrCode ? (
              <Image
                src={qrCode}
                alt="QR Code WhatsApp"
                width={256}
                height={256}
                unoptimized
                className="h-64 w-64 rounded-md border border-gray-200 bg-white p-2 dark:border-gray-700"
              />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                QR code indisponivel no momento. Clique em Conectar bot para gerar.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Teste de envio</p>
          <h4 className="mt-2 text-lg font-black tracking-tight text-gray-900 dark:text-white">Validar canal</h4>

          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              Telefone (com DDI/DDD)
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="5511999999999"
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              Mensagem
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="mt-1 min-h-28 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
              />
            </label>

            <button
              type="button"
              onClick={() => void sendTestMessage()}
              disabled={actionLoading}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-70 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Enviar teste
            </button>
          </div>
        </article>
      </section>
    </section>
  );
}
