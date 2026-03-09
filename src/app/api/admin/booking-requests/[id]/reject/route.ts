import { BookingRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMessagingProvider } from "@/lib/messaging-provider";
import { prisma } from "@/lib/prisma";

type RejectPayload = {
  reason?: string;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await context.params;

  let payload: RejectPayload = {};
  try {
    payload = (await request.json()) as RejectPayload;
  } catch {
    payload = {};
  }

  const reason = payload.reason?.trim();
  if (!reason) {
    return NextResponse.json({ ok: false, error: "Motivo da rejeicao e obrigatorio" }, { status: 400 });
  }

  const bookingRequest = await prisma.bookingRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      requestedStartAt: true,
      customer: {
        select: {
          phoneE164: true,
          name: true,
        },
      },
    },
  });

  if (!bookingRequest) {
    return NextResponse.json({ ok: false, error: "Solicitacao nao encontrada" }, { status: 404 });
  }

  if (bookingRequest.status !== BookingRequestStatus.PENDING) {
    return NextResponse.json({ ok: false, error: "Somente solicitacoes pendentes podem ser rejeitadas" }, { status: 409 });
  }

  const updated = await prisma.bookingRequest.update({
    where: { id },
    data: {
      status: BookingRequestStatus.REJECTED,
      statusReason: reason,
      rejectedAt: new Date(),
      approvedByAdminId: session.user.id,
    },
    select: {
      id: true,
      status: true,
      statusReason: true,
      rejectedAt: true,
    },
  });

  try {
    await getMessagingProvider().sendBookingDecision({
      phone: bookingRequest.customer.phoneE164,
      customerName: bookingRequest.customer.name?.trim() || bookingRequest.customer.phoneE164,
      decision: "REJECTED",
      startAt: bookingRequest.requestedStartAt,
      reason,
    });
  } catch (notificationError) {
    console.error("Falha ao notificar rejeição de booking request", notificationError);
  }

  return NextResponse.json({ ok: true, request: updated });
}
