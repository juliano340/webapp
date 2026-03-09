import { createHash, createHmac, randomInt } from "crypto";
import { OtpChallengePurpose, OtpChallengeStatus } from "@prisma/client";
import { getMessagingProvider } from "@/lib/messaging-provider";
import { prisma } from "@/lib/prisma";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeBrazilToE164(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function getOtpSecret(): string {
  return process.env.CUSTOMER_OTP_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "dev-customer-otp-secret";
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashOtp(challengeId: string, code: string): string {
  return createHmac("sha256", getOtpSecret()).update(`${challengeId}:${code}`).digest("hex");
}

function generateOtpCode(): string {
  return `${randomInt(0, 1_000_000)}`.padStart(6, "0");
}

function getOtpTtlSeconds(): number {
  const value = Number(process.env.CUSTOMER_OTP_TTL_SECONDS || "300");
  if (!Number.isFinite(value) || value < 60 || value > 1800) {
    return 300;
  }

  return Math.floor(value);
}

async function ensureRateLimit(phoneE164: string, ip: string | null): Promise<void> {
  const now = new Date();
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [phone15m, phone24h] = await Promise.all([
    prisma.otpChallenge.count({
      where: {
        phoneE164,
        createdAt: { gte: fifteenMinAgo },
      },
    }),
    prisma.otpChallenge.count({
      where: {
        phoneE164,
        createdAt: { gte: dayAgo },
      },
    }),
  ]);

  if (phone15m >= 3 || phone24h >= 10) {
    throw new Error("Limite de tentativas de OTP excedido para este telefone");
  }

  if (!ip) {
    return;
  }

  const ipHash = hashText(ip);
  const ipCount = await prisma.otpChallenge.count({
    where: {
      ipHash,
      createdAt: { gte: fifteenMinAgo },
    },
  });

  if (ipCount >= 20) {
    throw new Error("Limite de tentativas de OTP excedido para este IP");
  }
}

export async function requestCustomerOtp(phone: string, ip: string | null, userAgent: string | null): Promise<void> {
  const phoneE164 = normalizeBrazilToE164(phone);
  if (!(phoneE164.length === 12 || phoneE164.length === 13)) {
    throw new Error("Telefone invalido. Use DDI+DDD, ex: 5511999999999");
  }

  await ensureRateLimit(phoneE164, ip);

  const ipHash = ip ? hashText(ip) : null;
  const userAgentHash = userAgent ? hashText(userAgent) : null;
  const expiresAt = new Date(Date.now() + getOtpTtlSeconds() * 1000);
  const otpCode = generateOtpCode();

  const existingCustomer = await prisma.customer.findUnique({
    where: { phoneE164 },
    select: { id: true },
  });

  await prisma.otpChallenge.updateMany({
    where: {
      phoneE164,
      purpose: OtpChallengePurpose.LOGIN,
      status: { in: [OtpChallengeStatus.CREATED, OtpChallengeStatus.SENT] },
    },
    data: {
      status: OtpChallengeStatus.CANCELLED,
      consumedAt: new Date(),
    },
  });

  const challenge = await prisma.otpChallenge.create({
    data: {
      customerId: existingCustomer?.id,
      phoneE164,
      purpose: OtpChallengePurpose.LOGIN,
      status: OtpChallengeStatus.CREATED,
      otpHash: "pending",
      expiresAt,
      ipHash,
      userAgentHash,
    },
    select: { id: true },
  });

  const otpHash = hashOtp(challenge.id, otpCode);
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: {
      otpHash,
    },
  });

  try {
    const sendResult = await getMessagingProvider().sendOtp({
      phone: phoneE164,
      code: otpCode,
      ttlMinutes: Math.floor(getOtpTtlSeconds() / 60),
    });

    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        status: OtpChallengeStatus.SENT,
        providerMessageId: sendResult.providerMessageId,
        lastSentAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        status: OtpChallengeStatus.CANCELLED,
        consumedAt: new Date(),
      },
    });

    throw error;
  }
}

export async function verifyCustomerOtp(phone: string, code: string): Promise<{ customerId: string }> {
  const phoneE164 = normalizeBrazilToE164(phone);
  const normalizedCode = normalizePhone(code);
  if (normalizedCode.length !== 6) {
    throw new Error("Codigo OTP invalido");
  }

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      phoneE164,
      purpose: OtpChallengePurpose.LOGIN,
      status: { in: [OtpChallengeStatus.CREATED, OtpChallengeStatus.SENT] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      expiresAt: true,
      attemptCount: true,
      maxAttempts: true,
      otpHash: true,
    },
  });

  if (!challenge) {
    throw new Error("Codigo invalido ou expirado");
  }

  if (challenge.expiresAt.getTime() <= Date.now()) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        status: OtpChallengeStatus.EXPIRED,
        consumedAt: new Date(),
      },
    });
    throw new Error("Codigo invalido ou expirado");
  }

  if (challenge.attemptCount >= challenge.maxAttempts) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        status: OtpChallengeStatus.LOCKED,
        consumedAt: new Date(),
      },
    });
    throw new Error("Codigo invalido ou expirado");
  }

  const receivedHash = hashOtp(challenge.id, normalizedCode);
  if (receivedHash !== challenge.otpHash) {
    const nextAttempts = challenge.attemptCount + 1;
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        attemptCount: nextAttempts,
        status: nextAttempts >= challenge.maxAttempts ? OtpChallengeStatus.LOCKED : OtpChallengeStatus.SENT,
        consumedAt: nextAttempts >= challenge.maxAttempts ? new Date() : null,
      },
    });
    throw new Error("Codigo invalido ou expirado");
  }

  const customer = await prisma.customer.upsert({
    where: { phoneE164 },
    update: { lastLoginAt: new Date() },
    create: {
      phoneE164,
      lastLoginAt: new Date(),
    },
    select: { id: true },
  });

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: {
      customerId: customer.id,
      status: OtpChallengeStatus.CONSUMED,
      verifiedAt: new Date(),
      consumedAt: new Date(),
      attemptCount: challenge.attemptCount + 1,
    },
  });

  return { customerId: customer.id };
}
