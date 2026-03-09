import { NextResponse } from "next/server";
import { requestCustomerOtp } from "@/lib/customer-otp";

type RequestBody = {
  phone?: string;
};

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",", 1);
    return first?.trim() || null;
  }

  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || null;
}

export async function POST(request: Request) {
  let payload: RequestBody;

  try {
    payload = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload invalido",
      },
      { status: 400 },
    );
  }

  if (!payload.phone || typeof payload.phone !== "string") {
    return NextResponse.json(
      {
        ok: false,
        error: "Telefone obrigatorio",
      },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent");

  try {
    await requestCustomerOtp(payload.phone, ip, userAgent);
  } catch {
    return NextResponse.json({
      ok: true,
      message: "Se este numero puder receber mensagens, enviaremos um codigo de acesso.",
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Se este numero puder receber mensagens, enviaremos um codigo de acesso.",
  });
}
