import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkingHours } from "@/lib/working-hours";

export async function GET() {
  const [services, barbers, systemSettings] = await Promise.all([
    prisma.service.findMany({
      select: {
        id: true,
        name: true,
        durationInMinutes: true,
        priceInCents: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.barber.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        confirmFarFutureAppointmentEnabled: true,
        openingTime: "09:00",
        closingTime: "20:00",
      },
    }),
  ]);

  const workingHours = resolveWorkingHours(systemSettings);

  return NextResponse.json({ ok: true, services, barbers, workingHours });
}
