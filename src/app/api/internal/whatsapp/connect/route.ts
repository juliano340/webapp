import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureWhatsAppBotConnected, getWhatsAppBotState } from "@/lib/whatsapp-bot";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const state = await ensureWhatsAppBotConnected();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao iniciar bot WhatsApp";
    return NextResponse.json({ ok: false, error: message, state: getWhatsAppBotState() }, { status: 500 });
  }
}
