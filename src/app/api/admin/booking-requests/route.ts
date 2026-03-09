import { BookingRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = statusParam === "APPROVED" || statusParam === "REJECTED" ? statusParam : "PENDING";

  const requests = await prisma.bookingRequest.findMany({
    where: {
      status: status as BookingRequestStatus,
    },
    include: {
      customer: {
        select: { id: true, name: true, phoneE164: true },
      },
      service: {
        select: { id: true, name: true, durationInMinutes: true },
      },
      barber: {
        select: { id: true, name: true },
      },
      approvedByAdmin: {
        select: { id: true, name: true, email: true },
      },
      appointment: {
        select: { id: true, status: true, startsAt: true, endsAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, requests });
}
