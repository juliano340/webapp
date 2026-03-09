import { createHmac, timingSafeEqual } from "crypto";

export const CUSTOMER_SESSION_COOKIE = "customer_session";

type CustomerSessionPayload = {
  customerId: string;
  exp: number;
};

function getSessionSecret(): string {
  return process.env.CUSTOMER_SESSION_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "dev-customer-session-secret";
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadEncoded: string): string {
  return createHmac("sha256", getSessionSecret()).update(payloadEncoded).digest("base64url");
}

export function createCustomerSessionToken(customerId: string, ttlSeconds = 60 * 60 * 24 * 7): string {
  const payload: CustomerSessionPayload = {
    customerId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function parseCustomerSessionToken(token: string): CustomerSessionPayload | null {
  const [payloadEncoded, signature] = token.split(".", 2);
  if (!payloadEncoded || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadEncoded);
  const provided = Buffer.from(signature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payloadEncoded)) as CustomerSessionPayload;
    if (!parsed.customerId || typeof parsed.exp !== "number") {
      return null;
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
