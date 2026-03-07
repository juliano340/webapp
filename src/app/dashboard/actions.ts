"use server";

import { AppointmentStatus, AuditOperation, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
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
  date: z.string().min(1),
  startTime: z.string().min(1),
  status: z.nativeEnum(AppointmentStatus).optional(),
  futureDateConfirmed: z.string().optional(),
});

const updateAppointmentSchema = appointmentSchema.extend({
  appointmentId: z.string().min(1),
});

const idSchema = z.object({
  id: z.string().min(1),
});

function parseServiceIdsFromForm(formData: FormData): string[] {
  const ids = formData
    .getAll("serviceIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  const fallback = formData.get("serviceId");
  if (ids.length === 0 && typeof fallback === "string" && fallback.trim() !== "") {
    ids.push(fallback.trim());
  }

  return Array.from(new Set(ids));
}

async function getSystemSettings() {
  return prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, confirmFarFutureAppointmentEnabled: true },
  });
}

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

function parseDateInput(value: string): Date | null {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  let year: number;
  let month: number;
  let day: number;

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (brMatch) {
    day = Number(brMatch[1]);
    month = Number(brMatch[2]);
    year = Number(brMatch[3]);
  } else {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);
  parsedDate.setHours(0, 0, 0, 0);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

async function getAuditActor() {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
  };
}

async function createAuditLog(params: {
  operation: AuditOperation;
  entityType: "Client" | "Barber" | "Service";
  entityId: string;
  details: string;
}) {
  const actor = await getAuditActor();

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      operation: params.operation,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
    },
  });
}

function assertAdminRole(role: Role, path: string): void {
  if (role !== Role.ADMIN) {
    redirectWithError(path, "Apenas administradores podem alterar cadastros.");
  }
}

export async function createClientAction(formData: FormData) {
  const errorPath = resolvePath(formData.get("errorPath"), "/dashboard/clientes");
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/clientes");
  const actor = await getAuditActor();
  assertAdminRole(actor.role, errorPath);

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    birthDate: formData.get("birthDate"),
  });

  if (!parsed.success) {
    redirectWithError(errorPath, "Dados invalidos para cliente.");
  }

  const birthDate = parseDateInput(parsed.data.birthDate);

  if (!birthDate) {
    redirectWithError(errorPath, "Data de nascimento invalida.");
  }

  const existingClient = await prisma.client.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingClient) {
    redirectWithError(errorPath, "Ja existe cliente com esse email.");
  }

  const createdClient = await prisma.client.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      birthDate,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      operation: AuditOperation.INSERT,
      entityType: "Client",
      entityId: createdClient.id,
      details: `Cliente criado: ${createdClient.name} (${createdClient.email})`,
    },
  });

  revalidatePath("/dashboard/clientes");
  redirectWithSuccess(successPath, "Cliente cadastrado com sucesso.");
}

export async function createServiceAction(formData: FormData) {
  const errorPath = resolvePath(formData.get("errorPath"), "/dashboard/servicos");
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/servicos");
  const actor = await getAuditActor();
  assertAdminRole(actor.role, errorPath);

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

  const createdService = await prisma.service.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      priceInCents,
      durationInMinutes: parsed.data.durationInMinutes,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      operation: AuditOperation.INSERT,
      entityType: "Service",
      entityId: createdService.id,
      details: `Servico criado: ${createdService.name}`,
    },
  });

  revalidatePath("/dashboard/servicos");
  redirectWithSuccess(successPath, "Servico cadastrado com sucesso.");
}

export async function createBarberAction(formData: FormData) {
  const errorPath = resolvePath(formData.get("errorPath"), "/dashboard/barbeiros");
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/barbeiros");
  const actor = await getAuditActor();
  assertAdminRole(actor.role, errorPath);

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

  const createdBarber = await prisma.barber.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      operation: AuditOperation.INSERT,
      entityType: "Barber",
      entityId: createdBarber.id,
      details: `Barbeiro criado: ${createdBarber.name}`,
    },
  });

  revalidatePath("/dashboard/barbeiros");
  redirectWithSuccess(successPath, "Barbeiro cadastrado com sucesso.");
}

export async function updateClientAction(formData: FormData) {
  const parsedId = idSchema.safeParse({ id: formData.get("id") });
  const errorPathFallback = parsedId.success
    ? `/dashboard/clientes/editar/${parsedId.data.id}`
    : "/dashboard/clientes";
  const errorPath = resolvePath(formData.get("errorPath"), errorPathFallback);
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/clientes");
  const actor = await getAuditActor();
  assertAdminRole(actor.role, errorPath);

  if (!parsedId.success) {
    redirectWithError(errorPath, "Cliente invalido para edicao.");
  }

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    birthDate: formData.get("birthDate"),
  });

  if (!parsed.success) {
    redirectWithError(errorPath, "Dados invalidos para cliente.");
  }

  const birthDate = parseDateInput(parsed.data.birthDate);

  if (!birthDate) {
    redirectWithError(errorPath, "Data de nascimento invalida.");
  }
  const existingClient = await prisma.client.findFirst({
    where: {
      email: parsed.data.email,
      id: { not: parsedId.data.id },
    },
    select: { id: true },
  });

  if (existingClient) {
    redirectWithError(errorPath, "Ja existe cliente com esse email.");
  }

  const updatedClient = await prisma.client.update({
    where: { id: parsedId.data.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      birthDate,
    },
  });

  await createAuditLog({
    operation: AuditOperation.UPDATE,
    entityType: "Client",
    entityId: updatedClient.id,
    details: `Cliente atualizado: ${updatedClient.name} (${updatedClient.email})`,
  });

  revalidatePath("/dashboard/clientes");
  redirectWithSuccess(successPath, "Cliente atualizado com sucesso.");
}

export async function deleteClientAction(formData: FormData) {
  const parsedId = idSchema.safeParse({ id: formData.get("id") });
  const errorPath = resolvePath(formData.get("errorPath"), "/dashboard/clientes");
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/clientes");
  const actor = await getAuditActor();
  assertAdminRole(actor.role, errorPath);

  if (!parsedId.success) {
    redirectWithError(errorPath, "Cliente invalido para exclusao.");
  }

  const deletedClient = await prisma.client.delete({
    where: { id: parsedId.data.id },
    select: { id: true, name: true, email: true },
  });

  await createAuditLog({
    operation: AuditOperation.DELETE,
    entityType: "Client",
    entityId: deletedClient.id,
    details: `Cliente removido: ${deletedClient.name} (${deletedClient.email})`,
  });

  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/agenda");
  redirectWithSuccess(successPath, "Cliente removido com sucesso.");
}

export async function updateBarberAction(formData: FormData) {
  const parsedId = idSchema.safeParse({ id: formData.get("id") });
  const errorPathFallback = parsedId.success
    ? `/dashboard/barbeiros/editar/${parsedId.data.id}`
    : "/dashboard/barbeiros";
  const errorPath = resolvePath(formData.get("errorPath"), errorPathFallback);
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/barbeiros");
  const actor = await getAuditActor();
  assertAdminRole(actor.role, errorPath);

  if (!parsedId.success) {
    redirectWithError(errorPath, "Barbeiro invalido para edicao.");
  }

  const parsed = barberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    redirectWithError(errorPath, "Dados invalidos para barbeiro.");
  }

  const normalizedEmail = parsed.data.email || null;
  if (normalizedEmail) {
    const existingBarber = await prisma.barber.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: parsedId.data.id },
      },
      select: { id: true },
    });

    if (existingBarber) {
      redirectWithError(errorPath, "Ja existe barbeiro com esse email.");
    }
  }

  const updatedBarber = await prisma.barber.update({
    where: { id: parsedId.data.id },
    data: {
      name: parsed.data.name,
      email: normalizedEmail,
      phone: parsed.data.phone,
    },
  });

  await createAuditLog({
    operation: AuditOperation.UPDATE,
    entityType: "Barber",
    entityId: updatedBarber.id,
    details: `Barbeiro atualizado: ${updatedBarber.name}`,
  });

  revalidatePath("/dashboard/barbeiros");
  revalidatePath("/dashboard/agenda");
  redirectWithSuccess(successPath, "Barbeiro atualizado com sucesso.");
}

export async function deleteBarberAction(formData: FormData) {
  const parsedId = idSchema.safeParse({ id: formData.get("id") });
  const errorPath = resolvePath(formData.get("errorPath"), "/dashboard/barbeiros");
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/barbeiros");
  const actor = await getAuditActor();
  assertAdminRole(actor.role, errorPath);

  if (!parsedId.success) {
    redirectWithError(errorPath, "Barbeiro invalido para exclusao.");
  }

  const deletedBarber = await prisma.barber.delete({
    where: { id: parsedId.data.id },
    select: { id: true, name: true },
  });

  await createAuditLog({
    operation: AuditOperation.DELETE,
    entityType: "Barber",
    entityId: deletedBarber.id,
    details: `Barbeiro removido: ${deletedBarber.name}`,
  });

  revalidatePath("/dashboard/barbeiros");
  revalidatePath("/dashboard/agenda");
  redirectWithSuccess(successPath, "Barbeiro removido com sucesso.");
}

export async function updateServiceAction(formData: FormData) {
  const parsedId = idSchema.safeParse({ id: formData.get("id") });
  const errorPathFallback = parsedId.success
    ? `/dashboard/servicos/editar/${parsedId.data.id}`
    : "/dashboard/servicos";
  const errorPath = resolvePath(formData.get("errorPath"), errorPathFallback);
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/servicos");
  const actor = await getAuditActor();
  assertAdminRole(actor.role, errorPath);

  if (!parsedId.success) {
    redirectWithError(errorPath, "Servico invalido para edicao.");
  }

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
  const updatedService = await prisma.service.update({
    where: { id: parsedId.data.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      priceInCents,
      durationInMinutes: parsed.data.durationInMinutes,
    },
  });

  await createAuditLog({
    operation: AuditOperation.UPDATE,
    entityType: "Service",
    entityId: updatedService.id,
    details: `Servico atualizado: ${updatedService.name}`,
  });

  revalidatePath("/dashboard/servicos");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  redirectWithSuccess(successPath, "Servico atualizado com sucesso.");
}

export async function deleteServiceAction(formData: FormData) {
  const parsedId = idSchema.safeParse({ id: formData.get("id") });
  const errorPath = resolvePath(formData.get("errorPath"), "/dashboard/servicos");
  const successPath = resolvePath(formData.get("successPath"), "/dashboard/servicos");
  const actor = await getAuditActor();
  assertAdminRole(actor.role, errorPath);

  if (!parsedId.success) {
    redirectWithError(errorPath, "Servico invalido para exclusao.");
  }

  const deletedService = await prisma.service.delete({
    where: { id: parsedId.data.id },
    select: { id: true, name: true },
  });

  await createAuditLog({
    operation: AuditOperation.DELETE,
    entityType: "Service",
    entityId: deletedService.id,
    details: `Servico removido: ${deletedService.name}`,
  });

  revalidatePath("/dashboard/servicos");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  redirectWithSuccess(successPath, "Servico removido com sucesso.");
}

export async function createAppointmentAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/agenda");
  const serviceIds = parseServiceIdsFromForm(formData);

  const parsed = appointmentSchema.safeParse({
    clientId: formData.get("clientId"),
    barberId: formData.get("barberId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    status: formData.get("status"),
    futureDateConfirmed: formData.get("futureDateConfirmed"),
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "Dados invalidos para agendamento.");
  }

  if (serviceIds.length === 0) {
    redirectWithError(returnPath, "Selecione ao menos um servico.");
  }

  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, durationInMinutes: true },
  });

  if (services.length !== serviceIds.length) {
    redirectWithError(returnPath, "Um ou mais servicos nao foram encontrados.");
  }

  const serviceById = new Map(services.map((service) => [service.id, service]));
  const orderedServices = serviceIds
    .map((id) => serviceById.get(id))
    .filter((service): service is NonNullable<typeof service> => Boolean(service));

  if (orderedServices.length === 0) {
    redirectWithError(returnPath, "Selecione ao menos um servico valido.");
  }

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.startTime}:00`);

  if (Number.isNaN(startsAt.getTime())) {
    redirectWithError(returnPath, "Data ou horario invalido.");
  }

  const now = new Date();
  if (startsAt.getTime() < now.getTime()) {
    redirectWithError(returnPath, "Nao e permitido agendar em data/horario passado.");
  }

  const systemSettings = await getSystemSettings();
  if (systemSettings.confirmFarFutureAppointmentEnabled) {
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 7);

    if (startsAt.getTime() > limit.getTime() && parsed.data.futureDateConfirmed !== "1") {
      redirectWithError(returnPath, "Confirme o agendamento para data acima de 7 dias.");
    }
  }

  const totalDurationInMinutes = orderedServices.reduce((total, service) => total + service.durationInMinutes, 0);
  const endsAt = new Date(startsAt.getTime() + totalDurationInMinutes * 60 * 1000);

  if ((parsed.data.status ?? AppointmentStatus.AGENDADO) !== AppointmentStatus.CANCELADO) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        barberId: parsed.data.barberId,
        status: { not: AppointmentStatus.CANCELADO },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });

    if (conflict) {
      redirectWithError(returnPath, "Conflito: barbeiro ja possui agendamento nesse horario.");
    }
  }

  await prisma.appointment.create({
    data: {
      clientId: parsed.data.clientId,
      barberId: parsed.data.barberId,
      serviceId: orderedServices[0].id,
      status: parsed.data.status ?? AppointmentStatus.AGENDADO,
      startsAt,
      endsAt,
      extraServices: {
        create: orderedServices.slice(1).map((service) => ({
          serviceId: service.id,
        })),
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  redirectWithSuccess(returnPath, "Agendamento criado com sucesso.");
}

export async function updateAppointmentAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/agenda");
  const serviceIds = parseServiceIdsFromForm(formData);

  const parsed = updateAppointmentSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    clientId: formData.get("clientId"),
    barberId: formData.get("barberId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    status: formData.get("status"),
    futureDateConfirmed: formData.get("futureDateConfirmed"),
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "Dados invalidos para edicao do agendamento.");
  }

  if (serviceIds.length === 0) {
    redirectWithError(returnPath, "Selecione ao menos um servico.");
  }

  const [services, appointment] = await Promise.all([
    prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, durationInMinutes: true },
    }),
    prisma.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
      select: { id: true },
    }),
  ]);

  if (!appointment) {
    redirectWithError(returnPath, "Agendamento nao encontrado.");
  }

  if (services.length !== serviceIds.length) {
    redirectWithError(returnPath, "Um ou mais servicos nao foram encontrados.");
  }

  const serviceById = new Map(services.map((service) => [service.id, service]));
  const orderedServices = serviceIds
    .map((id) => serviceById.get(id))
    .filter((service): service is NonNullable<typeof service> => Boolean(service));

  if (orderedServices.length === 0) {
    redirectWithError(returnPath, "Selecione ao menos um servico valido.");
  }

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.startTime}:00`);

  if (Number.isNaN(startsAt.getTime())) {
    redirectWithError(returnPath, "Data ou horario invalido.");
  }

  const now = new Date();
  if (startsAt.getTime() < now.getTime()) {
    redirectWithError(returnPath, "Nao e permitido agendar em data/horario passado.");
  }

  const systemSettings = await getSystemSettings();
  if (systemSettings.confirmFarFutureAppointmentEnabled) {
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 7);

    if (startsAt.getTime() > limit.getTime() && parsed.data.futureDateConfirmed !== "1") {
      redirectWithError(returnPath, "Confirme o agendamento para data acima de 7 dias.");
    }
  }

  const totalDurationInMinutes = orderedServices.reduce((total, service) => total + service.durationInMinutes, 0);
  const endsAt = new Date(startsAt.getTime() + totalDurationInMinutes * 60 * 1000);

  if ((parsed.data.status ?? AppointmentStatus.AGENDADO) !== AppointmentStatus.CANCELADO) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        barberId: parsed.data.barberId,
        status: { not: AppointmentStatus.CANCELADO },
        id: { not: parsed.data.appointmentId },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });

    if (conflict) {
      redirectWithError(returnPath, "Conflito: barbeiro ja possui agendamento nesse horario.");
    }
  }

  await prisma.appointment.update({
    where: { id: parsed.data.appointmentId },
    data: {
      clientId: parsed.data.clientId,
      barberId: parsed.data.barberId,
      serviceId: orderedServices[0].id,
      status: parsed.data.status ?? AppointmentStatus.AGENDADO,
      startsAt,
      endsAt,
      extraServices: {
        deleteMany: {},
        create: orderedServices.slice(1).map((service) => ({
          serviceId: service.id,
        })),
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  redirectWithSuccess(returnPath, "Agendamento atualizado com sucesso.");
}

export async function deleteAppointmentAction(formData: FormData) {
  const returnPath = resolvePath(formData.get("returnPath"), "/dashboard/agenda");
  const parsedId = idSchema.safeParse({ id: formData.get("id") });

  if (!parsedId.success) {
    redirectWithError(returnPath, "Agendamento invalido para exclusao.");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: parsedId.data.id },
    select: { id: true },
  });

  if (!appointment) {
    redirectWithError(returnPath, "Agendamento nao encontrado.");
  }

  await prisma.appointment.delete({ where: { id: parsedId.data.id } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  redirectWithSuccess(returnPath, "Agendamento removido com sucesso.");
}
