"use server";

import { CrmReminderStatus, CrmRuleType, Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { processPendingCrmReminders } from "@/lib/crm-dispatch";
import { generateCrmRemindersWithJobRun } from "@/lib/crm-reminders";
import { prisma } from "@/lib/prisma";

const ruleUpdateSchema = z.object({
  type: z.nativeEnum(CrmRuleType),
  daysAfterService: z.coerce.number().int().min(1).max(120).optional(),
  template: z.string().min(8),
});

const reminderStatusSchema = z.object({
  reminderId: z.string().min(1),
  status: z.nativeEnum(CrmReminderStatus),
  details: z.string().optional(),
});

function withQueryParam(path: string, key: "error" | "success", value: string): string {
  const [pathname, existingQuery = ""] = path.split("?", 2);
  const params = new URLSearchParams(existingQuery);
  params.set(key, value);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function resolvePath(value: FormDataEntryValue | null, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/dashboard")) {
    return fallback;
  }

  return value;
}

async function ensureAdmin(path: string) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== Role.ADMIN) {
    redirect(withQueryParam(path, "error", "Acesso restrito a administradores."));
  }

  return session.user;
}

async function ensureDefaultRules() {
  await Promise.all([
    prisma.crmAutomationRule.upsert({
      where: { type: CrmRuleType.POST_SERVICE },
      update: {},
      create: {
        type: CrmRuleType.POST_SERVICE,
        enabled: true,
        daysAfterService: 14,
        template:
          "Oi {nome}, tudo bem? Ja faz {dias} dias do seu {servico} com {barbeiro}. Estamos a disposicao para manutencao na {barbearia}.",
      },
    }),
    prisma.crmAutomationRule.upsert({
      where: { type: CrmRuleType.BIRTHDAY },
      update: {},
      create: {
        type: CrmRuleType.BIRTHDAY,
        enabled: true,
        daysAfterService: null,
        template:
          "Feliz aniversario, {nome}! A equipe da {barbearia} te deseja um dia incrivel. Conte com a gente para seu proximo atendimento.",
      },
    }),
  ]);
}

export async function saveCrmRuleAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/admin/crm/automacoes");
  await ensureAdmin(returnPath);
  await ensureDefaultRules();

  const parsed = ruleUpdateSchema.safeParse({
    type: formData.get("type"),
    daysAfterService: formData.get("daysAfterService"),
    template: formData.get("template"),
  });

  if (!parsed.success) {
    redirect(withQueryParam(returnPath, "error", "Dados invalidos para automacao CRM."));
  }

  const enabled = formData.get("enabled") === "on";

  await prisma.crmAutomationRule.update({
    where: { type: parsed.data.type },
    data: {
      enabled,
      template: parsed.data.template,
      daysAfterService: parsed.data.type === CrmRuleType.POST_SERVICE ? parsed.data.daysAfterService ?? 14 : null,
    },
  });

  redirect(withQueryParam(returnPath, "success", "Regra de automacao atualizada."));
}

export async function updateCrmReminderStatusAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/admin/crm/lembretes");
  const user = await ensureAdmin(returnPath);

  const parsed = reminderStatusSchema.safeParse({
    reminderId: formData.get("reminderId"),
    status: formData.get("status"),
    details: formData.get("details"),
  });

  if (!parsed.success) {
    redirect(withQueryParam(returnPath, "error", "Dados invalidos para atualizar lembrete."));
  }

  const reminder = await prisma.crmReminder.findUnique({
    where: { id: parsed.data.reminderId },
    select: { id: true },
  });

  if (!reminder) {
    redirect(withQueryParam(returnPath, "error", "Lembrete nao encontrado."));
  }

  const sentAt = parsed.data.status === CrmReminderStatus.SENT ? new Date() : null;

  await prisma.$transaction([
    prisma.crmReminder.update({
      where: { id: parsed.data.reminderId },
      data: {
        status: parsed.data.status,
        sentAt,
      },
    }),
    prisma.crmReminderEvent.create({
      data: {
        reminderId: parsed.data.reminderId,
        actorId: user.id || null,
        actorEmail: user.email || null,
        action: `STATUS_${parsed.data.status}`,
        details: parsed.data.details || null,
      },
    }),
  ]);

  redirect(withQueryParam(returnPath, "success", "Status do lembrete atualizado."));
}

export async function triggerCrmRemindersNowAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/admin/crm");
  const user = await ensureAdmin(returnPath);

  let result: { generatedPostService: number; generatedBirthday: number };

  try {
    result = await generateCrmRemindersWithJobRun({
      source: "ADMIN_MANUAL",
      triggeredById: user.id || null,
      triggeredByEmail: user.email || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar lembretes.";
    redirect(withQueryParam(returnPath, "error", message));
  }

  redirect(
    withQueryParam(
      returnPath,
      "success",
      `Lembretes gerados: pos-servico ${result.generatedPostService}, aniversario ${result.generatedBirthday}.`,
    ),
  );
}

export async function triggerCrmDispatchNowAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/admin/crm/lembretes");
  const user = await ensureAdmin(returnPath);

  let result: { processed: number; sent: number; failed: number };

  try {
    result = await processPendingCrmReminders({
      source: "ADMIN_MANUAL_DISPATCH",
      actorId: user.id || null,
      actorEmail: user.email || null,
      limit: 100,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar fila de lembretes.";
    redirect(withQueryParam(returnPath, "error", message));
  }

  redirect(
    withQueryParam(
      returnPath,
      "success",
      `Fila processada: ${result.processed} itens, ${result.sent} enviados, ${result.failed} falhas.`,
    ),
  );
}
