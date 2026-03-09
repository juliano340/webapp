import { sendWhatsAppText } from "@/lib/whatsapp-bot";

export type MessagingSendResult = {
  providerMessageId: string | null;
};

export type SendOtpInput = {
  phone: string;
  code: string;
  ttlMinutes: number;
};

export type SendBookingDecisionInput = {
  phone: string;
  customerName: string;
  decision: "APPROVED" | "REJECTED";
  startAt: Date;
  reason?: string | null;
};

export interface MessagingProvider {
  sendOtp(input: SendOtpInput): Promise<MessagingSendResult>;
  sendBookingDecision(input: SendBookingDecisionInput): Promise<MessagingSendResult>;
}

class InternalWhatsAppMessagingProvider implements MessagingProvider {
  async sendOtp(input: SendOtpInput): Promise<MessagingSendResult> {
    return sendWhatsAppText({
      phone: input.phone,
      message: `Seu codigo de acesso e ${input.code}. Ele expira em ${input.ttlMinutes} minutos.`,
    });
  }

  async sendBookingDecision(input: SendBookingDecisionInput): Promise<MessagingSendResult> {
    const dateLabel = input.startAt.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const message =
      input.decision === "APPROVED"
        ? `Oi ${input.customerName}, seu agendamento para ${dateLabel} foi aprovado.`
        : `Oi ${input.customerName}, seu agendamento para ${dateLabel} foi rejeitado.${input.reason ? ` Motivo: ${input.reason}` : ""}`;

    return sendWhatsAppText({
      phone: input.phone,
      message,
    });
  }
}

export function getMessagingProvider(): MessagingProvider {
  return new InternalWhatsAppMessagingProvider();
}
