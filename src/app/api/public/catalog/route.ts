import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [services, barbers] = await Promise.all([
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
  ]);

  return NextResponse.json({ ok: true, services, barbers });
}
