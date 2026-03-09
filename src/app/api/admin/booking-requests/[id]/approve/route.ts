import { AppointmentStatus, BookingRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMessagingProvider } from "@/lib/messaging-provider";
import { prisma } from "@/lib/prisma";

type ApprovePayload = {
  barberId?: string;
  startsAt?: string;
  endsAt?: string;
};

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await context.params;

  let payload: ApprovePayload = {};
  try {
    payload = (await request.json()) as ApprovePayload;
  } catch {
    payload = {};
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const bookingRequest = await tx.bookingRequest.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          customerId: true,
          serviceId: true,
          barberId: true,
          requestedStartAt: true,
          requestedEndAt: true,
          appointmentId: true,
          customer: {
            select: {
              id: true,
              name: true,
              phoneE164: true,
            },
          },
        },
      });

      if (!bookingRequest) {
        return { status: 404 as const };
      }

      if (bookingRequest.status === BookingRequestStatus.APPROVED && bookingRequest.appointmentId) {
        return {
          status: 200 as const,
          appointmentId: bookingRequest.appointmentId,
          idempotent: true,
          notify: null,
        };
      }

      if (bookingRequest.status !== BookingRequestStatus.PENDING) {
        return { status: 409 as const, message: "Solicitacao nao esta pendente" };
      }

      const barberId = payload.barberId || bookingRequest.barberId;
      if (!barberId) {
        return { status: 400 as const, message: "barberId obrigatorio para aprovar" };
      }

      const startsAt = parseDate(payload.startsAt) || bookingRequest.requestedStartAt;
      const endsAt = parseDate(payload.endsAt) || bookingRequest.requestedEndAt;
      if (endsAt <= startsAt) {
        return { status: 400 as const, message: "Janela de horario invalida" };
      }

      const conflict = await tx.appointment.findFirst({
        where: {
          barberId,
          status: { not: AppointmentStatus.CANCELADO },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });

      if (conflict) {
        return { status: 409 as const, message: "Conflito de horario para o barbeiro selecionado" };
      }

      const customerName = bookingRequest.customer.name?.trim() || bookingRequest.customer.phoneE164;
      const localPhone = bookingRequest.customer.phoneE164.startsWith("55")
        ? bookingRequest.customer.phoneE164.slice(2)
        : bookingRequest.customer.phoneE164;

      const existingClient = await tx.client.findFirst({
        where: {
          OR: [{ phone: bookingRequest.customer.phoneE164 }, { phone: localPhone }],
        },
        select: { id: true },
      });

      const clientId = existingClient
        ? existingClient.id
        : (
            await tx.client.create({
              data: {
                name: customerName,
                phone: localPhone,
                email: `wa-${bookingRequest.customer.id}@placeholder.local`,
                birthDate: new Date("1970-01-01T00:00:00.000Z"),
              },
              select: { id: true },
            })
          ).id;

      const appointment = await tx.appointment.create({
        data: {
          clientId,
          serviceId: bookingRequest.serviceId,
          barberId,
          status: AppointmentStatus.AGENDADO,
          startsAt,
          endsAt,
        },
        select: { id: true },
      });

      await tx.bookingRequest.update({
        where: { id: bookingRequest.id },
        data: {
          status: BookingRequestStatus.APPROVED,
          barberId,
          requestedStartAt: startsAt,
          requestedEndAt: endsAt,
          approvedByAdminId: session.user.id,
          approvedAt: new Date(),
          appointmentId: appointment.id,
        },
      });

      return {
        status: 200 as const,
        appointmentId: appointment.id,
        idempotent: false,
        notify: {
          phone: bookingRequest.customer.phoneE164,
          customerName,
          startsAt,
        },
      };
    });

    if (result.status === 404) {
      return NextResponse.json({ ok: false, error: "Solicitacao nao encontrada" }, { status: 404 });
    }

    if (result.status === 409) {
      return NextResponse.json({ ok: false, error: result.message }, { status: 409 });
    }

    if (result.status === 400) {
      return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
    }

    if (!result.idempotent && result.notify) {
      try {
        await getMessagingProvider().sendBookingDecision({
          phone: result.notify.phone,
          customerName: result.notify.customerName,
          decision: "APPROVED",
          startAt: result.notify.startsAt,
        });
      } catch (notificationError) {
        console.error("Falha ao notificar aprovação de booking request", notificationError);
      }
    }

    return NextResponse.json({
      ok: true,
      appointmentId: result.appointmentId,
      idempotent: result.idempotent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao aprovar solicitacao";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
