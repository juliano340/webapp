import { NextResponse } from "next/server";
import { generateCrmRemindersWithJobRun } from "@/lib/crm-reminders";

function isAuthorized(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET;
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

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateCrmRemindersWithJobRun({
    source: "INTERNAL_ENDPOINT",
  });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
