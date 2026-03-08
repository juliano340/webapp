import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { sendWhatsAppText } from "@/lib/whatsapp-bot";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Payload invalido" }, { status: 400 });
  }

  try {
    const result = await sendWhatsAppText({
      phone: parsed.data.phone,
      message: parsed.data.message,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no envio de teste";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
