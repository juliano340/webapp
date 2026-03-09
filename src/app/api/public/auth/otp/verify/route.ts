import { NextResponse } from "next/server";
import { createCustomerSessionToken, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-session";
import { verifyCustomerOtp } from "@/lib/customer-otp";

type RequestBody = {
  phone?: string;
  code?: string;
};

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

  if (!payload.phone || typeof payload.phone !== "string" || !payload.code || typeof payload.code !== "string") {
    return NextResponse.json(
      {
        ok: false,
        error: "Telefone e codigo sao obrigatorios",
      },
      { status: 400 },
    );
  }

  try {
    const verification = await verifyCustomerOtp(payload.phone, payload.code);
    const token = createCustomerSessionToken(verification.customerId);
    const response = NextResponse.json({ ok: true });

    response.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Codigo invalido ou expirado",
      },
      { status: 400 },
    );
  }
}
