"use server";

import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const rateSchema = z.object({
  ratePercent: z.coerce.number().min(0).max(100),
});

const idSchema = z.object({
  id: z.string().min(1),
});

function toBps(ratePercent: number): number {
  return Math.round(ratePercent * 100);
}

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

export async function saveDefaultCommissionAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/admin/comissoes");
  await ensureAdmin(returnPath);

  const parsed = rateSchema.safeParse({ ratePercent: formData.get("ratePercent") });
  if (!parsed.success) {
    redirect(withQueryParam(returnPath, "error", "Percentual padrao invalido."));
  }

  await prisma.commissionSettings.upsert({
    where: { id: 1 },
    update: { defaultRateBps: toBps(parsed.data.ratePercent) },
    create: { id: 1, defaultRateBps: toBps(parsed.data.ratePercent) },
  });

  redirect(withQueryParam(returnPath, "success", "Comissao padrao atualizada."));
}

export async function saveBarberCommissionRateAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/admin/comissoes");
  await ensureAdmin(returnPath);

  const parsedId = idSchema.safeParse({ id: formData.get("barberId") });
  const parsedRate = rateSchema.safeParse({ ratePercent: formData.get("ratePercent") });

  if (!parsedId.success || !parsedRate.success) {
    redirect(withQueryParam(returnPath, "error", "Dados invalidos para comissao do barbeiro."));
  }

  await prisma.barberCommissionRate.upsert({
    where: { barberId: parsedId.data.id },
    update: { rateBps: toBps(parsedRate.data.ratePercent) },
    create: { barberId: parsedId.data.id, rateBps: toBps(parsedRate.data.ratePercent) },
  });

  redirect(withQueryParam(returnPath, "success", "Comissao do barbeiro atualizada."));
}

export async function clearBarberCommissionRateAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/admin/comissoes");
  await ensureAdmin(returnPath);

  const parsedId = idSchema.safeParse({ id: formData.get("barberId") });
  if (!parsedId.success) {
    redirect(withQueryParam(returnPath, "error", "Barbeiro invalido."));
  }

  await prisma.barberCommissionRate.deleteMany({ where: { barberId: parsedId.data.id } });
  redirect(withQueryParam(returnPath, "success", "Comissao especifica do barbeiro removida."));
}

export async function saveServiceCommissionRateAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/admin/comissoes");
  await ensureAdmin(returnPath);

  const parsedId = idSchema.safeParse({ id: formData.get("serviceId") });
  const parsedRate = rateSchema.safeParse({ ratePercent: formData.get("ratePercent") });

  if (!parsedId.success || !parsedRate.success) {
    redirect(withQueryParam(returnPath, "error", "Dados invalidos para comissao do servico."));
  }

  await prisma.serviceCommissionRate.upsert({
    where: { serviceId: parsedId.data.id },
    update: { rateBps: toBps(parsedRate.data.ratePercent) },
    create: { serviceId: parsedId.data.id, rateBps: toBps(parsedRate.data.ratePercent) },
  });

  redirect(withQueryParam(returnPath, "success", "Comissao do servico atualizada."));
}

export async function clearServiceCommissionRateAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/admin/comissoes");
  await ensureAdmin(returnPath);

  const parsedId = idSchema.safeParse({ id: formData.get("serviceId") });
  if (!parsedId.success) {
    redirect(withQueryParam(returnPath, "error", "Servico invalido."));
  }

  await prisma.serviceCommissionRate.deleteMany({ where: { serviceId: parsedId.data.id } });
  redirect(withQueryParam(returnPath, "success", "Comissao especifica do servico removida."));
}
