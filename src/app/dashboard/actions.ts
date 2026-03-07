"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  birthDate: z.string().min(1),
});

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  priceInBRL: z.coerce.number().positive(),
  durationInMinutes: z.coerce.number().int().positive(),
});

const barberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(8),
});

const appointmentSchema = z.object({
  clientId: z.string().min(1),
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
});

const updateAppointmentSchema = appointmentSchema.extend({
  appointmentId: z.string().min(1),
});

function withQueryParam(path: string, key: "error" | "success", value: string): string {
  const [pathname, existingQuery = ""] = path.split("?", 2);
  const params = new URLSearchParams(existingQuery);
  params.set(key, value);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function redirectWithError(path: string, message: string): never {
  redirect(withQueryParam(path, "error", message));
}

function redirectWithSuccess(path: string, message: string): never {
  redirect(withQueryParam(path, "success", message));
}

function resolvePath(value: FormDataEntryValue | null, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/dashboard")) {
    return fallback;
  }

  return value;
}

export async function createClientAction(formData: FormData) {
  const errorPath = resolvePath(formData.get("errorPath"), "/dashboard/clientes");
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/clientes");

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    birthDate: formData.get("birthDate"),
  });

  if (!parsed.success) {
    redirectWithError(errorPath, "Dados invalidos para cliente.");
  }

  const birthDate = new Date(`${parsed.data.birthDate}T00:00:00`);

  const existingClient = await prisma.client.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingClient) {
    redirectWithError(errorPath, "Ja existe cliente com esse email.");
  }

  await prisma.client.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      birthDate,
    },
  });

  revalidatePath("/dashboard/clientes");
  redirectWithSuccess(successPath, "Cliente cadastrado com sucesso.");
}

export async function createServiceAction(formData: FormData) {
  const errorPath = resolvePath(formData.get("errorPath"), "/dashboard/servicos");
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/servicos");

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    priceInBRL: formData.get("priceInBRL"),
    durationInMinutes: formData.get("durationInMinutes"),
  });

  if (!parsed.success) {
    redirectWithError(errorPath, "Dados invalidos para servico.");
  }

  const priceInCents = Math.round(parsed.data.priceInBRL * 100);

  await prisma.service.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      priceInCents,
      durationInMinutes: parsed.data.durationInMinutes,
    },
  });

  revalidatePath("/dashboard/servicos");
  redirectWithSuccess(successPath, "Servico cadastrado com sucesso.");
}

export async function createBarberAction(formData: FormData) {
  const errorPath = resolvePath(formData.get("errorPath"), "/dashboard/barbeiros");
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/barbeiros");

  const parsed = barberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    redirectWithError(errorPath, "Dados invalidos para barbeiro.");
  }

  if (parsed.data.email) {
    const existingBarber = await prisma.barber.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existingBarber) {
      redirectWithError(errorPath, "Ja existe barbeiro com esse email.");
    }
  }

  await prisma.barber.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
    },
  });

  revalidatePath("/dashboard/barbeiros");
  redirectWithSuccess(successPath, "Barbeiro cadastrado com sucesso.");
}

export async function createAppointmentAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/agenda");

  const parsed = appointmentSchema.safeParse({
    clientId: formData.get("clientId"),
    barberId: formData.get("barberId"),
    serviceId: formData.get("serviceId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "Dados invalidos para agendamento.");
  }

  const service = await prisma.service.findUnique({
    where: { id: parsed.data.serviceId },
    select: { durationInMinutes: true },
  });

  if (!service) {
    redirectWithError(returnPath, "Servico nao encontrado.");
  }

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.startTime}:00`);

  if (Number.isNaN(startsAt.getTime())) {
    redirectWithError(returnPath, "Data ou horario invalido.");
  }

  const endsAt = new Date(startsAt.getTime() + service.durationInMinutes * 60 * 1000);

  const conflict = await prisma.appointment.findFirst({
    where: {
      barberId: parsed.data.barberId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });

  if (conflict) {
    redirectWithError(returnPath, "Conflito: barbeiro ja possui agendamento nesse horario.");
  }

  await prisma.appointment.create({
    data: {
      clientId: parsed.data.clientId,
      barberId: parsed.data.barberId,
      serviceId: parsed.data.serviceId,
      startsAt,
      endsAt,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  redirectWithSuccess(returnPath, "Agendamento criado com sucesso.");
}

export async function updateAppointmentAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/agenda");

  const parsed = updateAppointmentSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    clientId: formData.get("clientId"),
    barberId: formData.get("barberId"),
    serviceId: formData.get("serviceId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "Dados invalidos para edicao do agendamento.");
  }

  const [service, appointment] = await Promise.all([
    prisma.service.findUnique({
      where: { id: parsed.data.serviceId },
      select: { durationInMinutes: true },
    }),
    prisma.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
      select: { id: true },
    }),
  ]);

  if (!appointment) {
    redirectWithError(returnPath, "Agendamento nao encontrado.");
  }

  if (!service) {
    redirectWithError(returnPath, "Servico nao encontrado.");
  }

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.startTime}:00`);

  if (Number.isNaN(startsAt.getTime())) {
    redirectWithError(returnPath, "Data ou horario invalido.");
  }

  const endsAt = new Date(startsAt.getTime() + service.durationInMinutes * 60 * 1000);

  const conflict = await prisma.appointment.findFirst({
    where: {
      barberId: parsed.data.barberId,
      id: { not: parsed.data.appointmentId },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });

  if (conflict) {
    redirectWithError(returnPath, "Conflito: barbeiro ja possui agendamento nesse horario.");
  }

  await prisma.appointment.update({
    where: { id: parsed.data.appointmentId },
    data: {
      clientId: parsed.data.clientId,
      barberId: parsed.data.barberId,
      serviceId: parsed.data.serviceId,
      startsAt,
      endsAt,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  redirectWithSuccess(returnPath, "Agendamento atualizado com sucesso.");
}
