import { CrmReminderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp-bot";

type ProcessPendingCrmRemindersInput = {
  limit?: number;
  source: string;
  actorId?: string | null;
  actorEmail?: string | null;
};

export type ProcessPendingCrmRemindersResult = {
  processed: number;
  sent: number;
  failed: number;
};

type DeliveryPayload = {
  reminderId: string;
  type: string;
  client: {
    id: string;
    name: string;
    phone: string;
  };
  message: string;
  scheduledFor: string;
  source: string;
};

type SendWebhookResult = {
  providerMessageId: string | null;
  attempts: number;
};

class WebhookAttemptError extends Error {
  statusCode: number | null;
  retryable: boolean;

  constructor(message: string, statusCode: number | null, retryable: boolean) {
    super(message);
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function isPhoneValid(phone: string): boolean {
  return normalizePhone(phone).length >= 8;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erro desconhecido no envio";
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function isRetryableStatus(statusCode: number): boolean {
  if (statusCode === 408 || statusCode === 429) return true;
  if (statusCode >= 500) return true;
  return false;
}

function isTransientError(error: unknown): boolean {
  if (error instanceof WebhookAttemptError) {
    return error.retryable;
  }

  return false;
}

async function sendWithWebhook(payload: DeliveryPayload): Promise<string | null> {
  const webhookUrl = process.env.CRM_DELIVERY_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    throw new Error("CRM_DELIVERY_WEBHOOK_URL nao configurado");
  }

  const token = process.env.CRM_DELIVERY_WEBHOOK_TOKEN?.trim();
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  headers["idempotency-key"] = payload.reminderId;

  const timeoutMs = parsePositiveInt(process.env.CRM_DELIVERY_TIMEOUT_MS, 10000);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    throw new WebhookAttemptError(
      isAbort ? `Webhook timeout apos ${timeoutMs}ms` : getErrorMessage(error),
      null,
      true,
    );
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    let responseDetails = "";
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = (await response.json()) as { error?: unknown; message?: unknown };
        const text = typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : "";
        if (text) {
          responseDetails = `: ${text}`;
        }
      } else {
        const text = (await response.text()).trim();
        if (text) {
          responseDetails = `: ${text.slice(0, 300)}`;
        }
      }
    } catch {
      responseDetails = "";
    }

    throw new WebhookAttemptError(
      `Webhook retornou ${response.status}${responseDetails}`,
      response.status,
      isRetryableStatus(response.status),
    );
  }

  let providerMessageId: string | null = null;

  try {
    const data = (await response.json()) as { id?: unknown; messageId?: unknown };
    if (typeof data.id === "string" && data.id.length > 0) {
      providerMessageId = data.id;
    } else if (typeof data.messageId === "string" && data.messageId.length > 0) {
      providerMessageId = data.messageId;
    }
  } catch {
    providerMessageId = null;
  }

  return providerMessageId;
}

async function sendWithInternalWhatsApp(payload: DeliveryPayload): Promise<string | null> {
  const result = await sendWhatsAppText({
    phone: payload.client.phone,
    message: payload.message,
  });

  return result.providerMessageId;
}

async function sendDelivery(payload: DeliveryPayload): Promise<string | null> {
  const mode = process.env.CRM_DELIVERY_MODE?.trim().toUpperCase();
  if (mode === "INTERNAL_WHATSAPP_BOT") {
    return sendWithInternalWhatsApp(payload);
  }

  return sendWithWebhook(payload);
}

async function sendWithRetry(payload: DeliveryPayload): Promise<SendWebhookResult> {
  const maxAttempts = parsePositiveInt(process.env.CRM_DELIVERY_MAX_ATTEMPTS, 3);
  const baseDelayMs = parsePositiveInt(process.env.CRM_DELIVERY_RETRY_BASE_DELAY_MS, 500);

  let attempts = 0;
  let lastError: unknown = null;

  while (attempts < maxAttempts) {
    attempts += 1;

    try {
      const providerMessageId = await sendDelivery(payload);
      return {
        providerMessageId,
        attempts,
      };
    } catch (error) {
      lastError = error;

      const retryable = error instanceof WebhookAttemptError ? error.retryable : true;
      const hasNextAttempt = attempts < maxAttempts;
      if (!retryable || !hasNextAttempt) {
        break;
      }

      const delay = baseDelayMs * 2 ** (attempts - 1);
      await waitMs(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Falha no envio apos tentativas");
}

export async function processPendingCrmReminders({
  limit = 50,
  source,
  actorId = null,
  actorEmail = null,
}: ProcessPendingCrmRemindersInput): Promise<ProcessPendingCrmRemindersResult> {
  const now = new Date();
  const safeLimit = Math.max(1, Math.min(limit, 200));

  const reminders = await prisma.crmReminder.findMany({
    where: {
      status: CrmReminderStatus.PENDING,
      scheduledFor: { lte: now },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
    orderBy: { scheduledFor: "asc" },
    take: safeLimit,
  });

  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    if (!isPhoneValid(reminder.client.phone)) {
      await prisma.$transaction([
        prisma.crmReminder.update({
          where: { id: reminder.id },
          data: { status: CrmReminderStatus.FAILED },
        }),
        prisma.crmReminderEvent.create({
          data: {
            reminderId: reminder.id,
            actorId,
            actorEmail,
            action: "DISPATCH_FAILED",
            details: `${source}: Telefone invalido para envio`,
          },
        }),
      ]);

      failed += 1;
      continue;
    }

    const payload: DeliveryPayload = {
      reminderId: reminder.id,
      type: reminder.type,
      client: {
        id: reminder.client.id,
        name: reminder.client.name,
        phone: normalizePhone(reminder.client.phone),
      },
      message: reminder.messageSnapshot,
      scheduledFor: reminder.scheduledFor.toISOString(),
      source,
    };

    try {
      const sentResult = await sendWithRetry(payload);
      const details = sentResult.providerMessageId
        ? `${source}: Enviado com sucesso em ${sentResult.attempts} tentativa(s). Provider message id: ${sentResult.providerMessageId}`
        : `${source}: Enviado com sucesso em ${sentResult.attempts} tentativa(s)`;

      await prisma.$transaction([
        prisma.crmReminder.update({
          where: { id: reminder.id },
          data: {
            status: CrmReminderStatus.SENT,
            sentAt: new Date(),
          },
        }),
        prisma.crmReminderEvent.create({
          data: {
            reminderId: reminder.id,
            actorId,
            actorEmail,
            action: "DISPATCH_SENT",
            details,
          },
        }),
      ]);

      sent += 1;
    } catch (error) {
      if (isTransientError(error)) {
        await prisma.crmReminderEvent.create({
          data: {
            reminderId: reminder.id,
            actorId,
            actorEmail,
            action: "DISPATCH_RETRY",
            details: `${source}: Falha transitoria, lembrete mantido em PENDING. ${getErrorMessage(error)}`,
          },
        });
        continue;
      }

      await prisma.$transaction([
        prisma.crmReminder.update({
          where: { id: reminder.id },
          data: {
            status: CrmReminderStatus.FAILED,
          },
        }),
        prisma.crmReminderEvent.create({
          data: {
            reminderId: reminder.id,
            actorId,
            actorEmail,
            action: "DISPATCH_FAILED",
            details: `${source}: ${getErrorMessage(error)}`,
          },
        }),
      ]);

      failed += 1;
    }
  }

  return {
    processed: reminders.length,
    sent,
    failed,
  };
}
