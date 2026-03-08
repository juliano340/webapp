import { NextResponse } from "next/server";
import { processPendingCrmReminders } from "@/lib/crm-dispatch";

function isAuthorized(request: Request): boolean {
  const configuredSecret = process.env.INTERNAL_CRM_DISPATCH_SECRET || process.env.CRON_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const headerToken = request.headers.get("x-cron-secret");
  if (headerToken && headerToken === configuredSecret) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7);
    return token === configuredSecret;
  }

  return false;
}

function parseLimit(request: Request): number | undefined {
  const value = new URL(request.url).searchParams.get("limit");
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseLimit(request);

  const result = await processPendingCrmReminders({
    source: "INTERNAL_DISPATCH",
    limit,
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return handle(request);
}
