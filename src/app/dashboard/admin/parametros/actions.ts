"use server";

import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
}

export async function saveAgendaRulesAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/admin/parametros");
  await ensureAdmin(returnPath);

  const enabled = formData.get("confirmFarFutureAppointmentEnabled") === "on";

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: { confirmFarFutureAppointmentEnabled: enabled },
    create: { id: 1, confirmFarFutureAppointmentEnabled: enabled },
  });

  redirect(withQueryParam(returnPath, "success", "Parametros de agenda atualizados."));
}
