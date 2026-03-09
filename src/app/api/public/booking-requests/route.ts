import { AppointmentStatus, BookingRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

type BookingRequestPayload = {
  serviceId?: string;
  barberId?: string | null;
  requestedStartAt?: string;
  requestedEndAt?: string;
  notes?: string;
  idempotencyKey?: string;
};

function parseDate(input: string | undefined): Date | null {
  if (!input) {
    return null;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Nao autenticado" }, { status: 401 });
  }

  const requests = await prisma.bookingRequest.findMany({
    where: {
      customerId: customer.id,
    },
    include: {
      service: {
        select: { id: true, name: true, durationInMinutes: true },
      },
      barber: {
        select: { id: true, name: true },
      },
      appointment: {
        select: { id: true, status: true, startsAt: true, endsAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, requests });
}

export async function POST(request: Request) {
  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Nao autenticado" }, { status: 401 });
  }

  let payload: BookingRequestPayload;
  try {
    payload = (await request.json()) as BookingRequestPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Payload invalido" }, { status: 400 });
  }

  if (!payload.serviceId || typeof payload.serviceId !== "string") {
    return NextResponse.json({ ok: false, error: "serviceId obrigatorio" }, { status: 400 });
  }

  const requestedStartAt = parseDate(payload.requestedStartAt);
  const requestedEndAt = parseDate(payload.requestedEndAt);
  if (!requestedStartAt || !requestedEndAt || requestedEndAt <= requestedStartAt) {
    return NextResponse.json({ ok: false, error: "Janela de horario invalida" }, { status: 400 });
  }

  if (requestedStartAt <= new Date()) {
    return NextResponse.json({ ok: false, error: "Nao e permitido solicitar horario no passado" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({
    where: { id: payload.serviceId },
    select: { id: true, durationInMinutes: true },
  });

  if (!service) {
    return NextResponse.json({ ok: false, error: "Servico nao encontrado" }, { status: 404 });
  }

  if (payload.barberId) {
    const barber = await prisma.barber.findUnique({
      where: { id: payload.barberId },
      select: { id: true },
    });

    if (!barber) {
      return NextResponse.json({ ok: false, error: "Barbeiro nao encontrado" }, { status: 404 });
    }

    const conflict = await prisma.appointment.findFirst({
      where: {
        barberId: payload.barberId,
        status: { not: AppointmentStatus.CANCELADO },
        startsAt: { lt: requestedEndAt },
        endsAt: { gt: requestedStartAt },
      },
      select: { id: true },
    });

    if (conflict) {
      return NextResponse.json({ ok: false, error: "Horario indisponivel para este barbeiro" }, { status: 409 });
    }
  }

  const created = await prisma.bookingRequest.create({
    data: {
      customerId: customer.id,
      serviceId: service.id,
      barberId: payload.barberId || null,
      requestedStartAt,
      requestedEndAt,
      notes: payload.notes?.trim() || null,
      status: BookingRequestStatus.PENDING,
      idempotencyKey: payload.idempotencyKey?.trim() || null,
    },
    select: {
      id: true,
      status: true,
      requestedStartAt: true,
      requestedEndAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, request: created }, { status: 201 });
}
