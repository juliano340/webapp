import path from "path";
import { rm } from "fs/promises";
import pino from "pino";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState as createAuthState,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";

type BotConnectionStatus = "IDLE" | "INITIALIZING" | "QR_CODE" | "CONNECTED" | "DISCONNECTED" | "ERROR";

type BotState = {
  status: BotConnectionStatus;
  sessionName: string;
  qrCodeDataUrl: string | null;
  lastError: string | null;
  updatedAt: string;
};

type SendWhatsAppInput = {
  phone: string;
  message: string;
};

type SendWhatsAppResult = {
  providerMessageId: string | null;
};

type BaileysSocketLike = {
  user?: { id?: string | null };
  ev: {
    on: (event: string, listener: (...args: unknown[]) => void | Promise<void>) => void;
  };
  sendMessage: (jid: string, content: { text: string }) => Promise<unknown>;
  onWhatsApp?: (...numbers: string[]) => Promise<Array<Record<string, unknown>>>;
};

let state: BotState = {
  status: "IDLE",
  sessionName: process.env.CRM_INTERNAL_WHATSAPP_SESSION_NAME?.trim() || "crm-whatsapp",
  qrCodeDataUrl: null,
  lastError: null,
  updatedAt: new Date().toISOString(),
};

let socket: BaileysSocketLike | null = null;
let initPromise: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

const baileysLogger = pino({
  level: process.env.CRM_BAILEYS_LOG_LEVEL?.trim().toLowerCase() || "error",
});

function getSessionDir(): string {
  return path.join(process.cwd(), ".whatsapp-session", state.sessionName);
}

function updateState(partial: Partial<BotState>): void {
  state = {
    ...state,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeBrazilPhone(phone: string): string {
  const digits = normalizePhone(phone);

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function buildPhoneCandidates(normalizedPhone: string): string[] {
  const candidates = new Set<string>();
  candidates.add(normalizedPhone);

  if (normalizedPhone.startsWith("55") && (normalizedPhone.length === 12 || normalizedPhone.length === 13)) {
    candidates.add(normalizedPhone.slice(2));
  }

  if (normalizedPhone.startsWith("55") && normalizedPhone.length === 13) {
    const ddd = normalizedPhone.slice(2, 4);
    const local = normalizedPhone.slice(4);
    if (local.startsWith("9") && local.length === 9) {
      candidates.add(`55${ddd}${local.slice(1)}`);
      candidates.add(`${ddd}${local}`);
      candidates.add(`${ddd}${local.slice(1)}`);
    }
  }

  if (normalizedPhone.startsWith("55") && normalizedPhone.length === 12) {
    const ddd = normalizedPhone.slice(2, 4);
    const local = normalizedPhone.slice(4);
    if (!local.startsWith("9") && local.length === 8) {
      candidates.add(`55${ddd}9${local}`);
      candidates.add(`${ddd}${local}`);
      candidates.add(`${ddd}9${local}`);
    }
  }

  return Array.from(candidates);
}

function toJid(phone: string): string {
  return `${phone}@s.whatsapp.net`;
}

function extractStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;

  const candidate =
    "error" in (error as Record<string, unknown>) && (error as { error?: unknown }).error
      ? (error as { error?: unknown }).error
      : error;

  if (!candidate || typeof candidate !== "object") return null;

  const output = (candidate as { output?: { statusCode?: unknown } }).output;
  if (!output || typeof output !== "object") return null;
  const statusCode = output.statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

function extractDisconnectMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate =
    "error" in (error as Record<string, unknown>) && (error as { error?: unknown }).error
      ? (error as { error?: unknown }).error
      : error;

  if (!candidate || typeof candidate !== "object") {
    return "";
  }

  const maybeError = (candidate as { message?: unknown }).message;
  if (typeof maybeError === "string") {
    return maybeError;
  }

  const data = (candidate as { data?: unknown }).data;
  if (data && typeof data === "object") {
    const attrs = (data as { attrs?: unknown }).attrs;
    if (attrs && typeof attrs === "object") {
      const code = (attrs as { code?: unknown }).code;
      if (typeof code === "string" || typeof code === "number") {
        return String(code);
      }
    }
  }

  return "";
}

function shouldAutoReconnect(statusCode: number | null, disconnectMessage: string, loggedOut: boolean): boolean {
  if (loggedOut) {
    return false;
  }

  if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
    return true;
  }

  const normalized = disconnectMessage.toLowerCase();
  return normalized.includes("restart required") || normalized.includes("connection failure") || normalized === "515";
}

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(reason: string): void {
  const maxAttempts = parsePositiveInt(process.env.CRM_INTERNAL_WHATSAPP_MAX_RECONNECT_ATTEMPTS, 3);
  if (reconnectAttempts >= maxAttempts) {
    updateState({
      status: "DISCONNECTED",
      lastError: `Falha de reconexao apos ${maxAttempts} tentativas. ${reason}`,
    });
    return;
  }

  reconnectAttempts += 1;
  const delayMs = Math.min(5000, reconnectAttempts * 1200);
  updateState({
    status: "INITIALIZING",
    lastError: `Reconectando WhatsApp automaticamente (tentativa ${reconnectAttempts}/${maxAttempts})...`,
  });

  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (socket) {
      return;
    }

    void createSocket()
      .then((client) => {
        socket = client;
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Erro na reconexao";
        scheduleReconnect(message);
      });
  }, delayMs);
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForNotInitializing(maxWaitMs: number): Promise<void> {
  const start = Date.now();
  while (state.status === "INITIALIZING" && Date.now() - start < maxWaitMs) {
    await delay(100);
  }
}

async function setQrCode(qr: string): Promise<void> {
  try {
    const dataUrl = await QRCode.toDataURL(qr, {
      margin: 1,
      width: 320,
    });
    updateState({
      status: "QR_CODE",
      qrCodeDataUrl: dataUrl,
      lastError: null,
    });
  } catch {
    updateState({
      status: "QR_CODE",
      qrCodeDataUrl: null,
      lastError: "Falha ao gerar imagem do QR Code",
    });
  }
}

async function createSocket(): Promise<BaileysSocketLike> {
  const authDir = getSessionDir();
  const { state: authState, saveCreds } = await createAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const client = makeWASocket({
    auth: authState,
    version,
    logger: baileysLogger,
    printQRInTerminal: false,
    browser: Browsers.windows("Chrome"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    shouldSyncHistoryMessage: () => false,
  }) as unknown as BaileysSocketLike;

  client.ev.on("creds.update", saveCreds);

  client.ev.on("connection.update", (update) => {
    const event = update && typeof update === "object" ? (update as Record<string, unknown>) : {};

    const qr = event.qr;
    if (typeof qr === "string" && qr.length > 0) {
      void setQrCode(qr);
    }

    const connection = event.connection;
    if (connection === "open") {
      reconnectAttempts = 0;
      clearReconnectTimer();
      updateState({
        status: "CONNECTED",
        qrCodeDataUrl: null,
        lastError: null,
      });
      return;
    }

    if (connection === "close") {
      const statusCode = extractStatusCode(event.lastDisconnect);
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const disconnectMessage = extractDisconnectMessage(event.lastDisconnect);

      socket = null;

      if (shouldAutoReconnect(statusCode, disconnectMessage, loggedOut)) {
        scheduleReconnect("Conexao fechada com restart obrigatorio");
        return;
      }

      const disconnectCodeLabel = statusCode !== null ? String(statusCode) : disconnectMessage || "desconhecido";

      updateState({
        status: "DISCONNECTED",
        lastError: loggedOut
          ? "Sessao desconectada do WhatsApp. Conecte novamente via QR Code."
          : `Conexao do WhatsApp fechada (codigo ${disconnectCodeLabel}). Clique em Conectar bot para restabelecer.`,
      });
    }
  });

  return client;
}

export function getWhatsAppBotState(): BotState {
  return state;
}

export async function syncWhatsAppBotState(): Promise<BotState> {
  return state;
}

export async function ensureWhatsAppBotConnected(): Promise<BotState> {
  if (socket && state.status === "CONNECTED") {
    return state;
  }

  if (initPromise) {
    await initPromise;
    return state;
  }

  updateState({
    status: "INITIALIZING",
    lastError: null,
  });

  initPromise = (async () => {
    try {
      socket = await createSocket();
      await waitForNotInitializing(15000);
      if (state.status === "INITIALIZING") {
        updateState({
          status: "DISCONNECTED",
          lastError: "Timeout aguardando conexao. Escaneie o QR Code e tente novamente.",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao iniciar bot WhatsApp";
      updateState({
        status: "ERROR",
        lastError: message,
      });
      socket = null;
    } finally {
      initPromise = null;
    }
  })();

  await initPromise;

  if (state.status === "ERROR" || state.status === "DISCONNECTED") {
    throw new Error(state.lastError || "Falha ao conectar WhatsApp");
  }

  return state;
}

export async function resetWhatsAppBotSession(): Promise<BotState> {
  socket = null;
  initPromise = null;
  reconnectAttempts = 0;
  clearReconnectTimer();

  try {
    await rm(getSessionDir(), { recursive: true, force: true });
  } catch {
    // ignore filesystem cleanup errors
  }

  updateState({
    status: "IDLE",
    qrCodeDataUrl: null,
    lastError: null,
  });

  return state;
}

function extractProviderMessageId(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const key = (result as { key?: unknown }).key;
  if (!key || typeof key !== "object") return null;
  const id = (key as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function extractSelfPhone(): string | null {
  const userId = socket?.user?.id;
  if (!userId || typeof userId !== "string") {
    return null;
  }

  const phonePart = userId.split(":")[0] || userId;
  const digits = normalizePhone(phonePart);
  return digits.length >= 8 ? digits : null;
}

async function resolveDestinationJid(candidates: string[]): Promise<string> {
  if (!socket) {
    throw new Error("Cliente WhatsApp nao conectado");
  }

  if (typeof socket.onWhatsApp !== "function") {
    return toJid(candidates[0]);
  }

  try {
    const result = await socket.onWhatsApp(...candidates);

    for (const item of result) {
      const exists = item.exists;
      if (exists !== true) {
        continue;
      }

      const jid = item.jid;
      if (typeof jid === "string" && jid.includes("@")) {
        return jid;
      }
    }

    throw new Error("Numero nao encontrado no WhatsApp para os formatos testados");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao validar numero no WhatsApp";
    throw new Error(message);
  }
}

export async function sendWhatsAppText({ phone, message }: SendWhatsAppInput): Promise<SendWhatsAppResult> {
  const normalizedPhone = normalizeBrazilPhone(phone);
  if (!(normalizedPhone.length === 12 || normalizedPhone.length === 13)) {
    throw new Error("Telefone invalido. Use formato com DDI/DDD, ex: 5511999999999");
  }

  if (message.trim().length < 1) {
    throw new Error("Mensagem vazia");
  }

  await ensureWhatsAppBotConnected();
  if (!socket || state.status !== "CONNECTED") {
    throw new Error("WhatsApp nao conectado para envio");
  }

  const candidates = buildPhoneCandidates(normalizedPhone);
  const selfPhone = extractSelfPhone();
  if (selfPhone) {
    const normalizedSelf = normalizePhone(selfPhone);
    if (candidates.some((candidate) => normalizePhone(candidate) === normalizedSelf)) {
      throw new Error("Nao e permitido enviar mensagem de teste para o proprio numero da sessao WhatsApp");
    }
  }

  const jid = await resolveDestinationJid(candidates);
  const timeoutMs = parsePositiveInt(process.env.CRM_INTERNAL_WHATSAPP_SEND_TIMEOUT_MS, 10000);

  const result = await Promise.race([
    socket.sendMessage(jid, { text: message }),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Timeout ao enviar mensagem pelo WhatsApp"));
      }, timeoutMs);
    }),
  ]);

  const providerMessageId = extractProviderMessageId(result);
  if (!providerMessageId) {
    throw new Error("Envio sem confirmacao de ID pelo driver WhatsApp");
  }

  return { providerMessageId };
}
