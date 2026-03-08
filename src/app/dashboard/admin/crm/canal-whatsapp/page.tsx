import Link from "next/link";
import { BotPanel } from "./bot-panel";

export default function CrmCanalWhatsAppPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Canal WhatsApp</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Conecte o WhatsApp via QR Code e valide o envio sem sair do sistema.
          </p>
        </div>
        <Link
          href="/dashboard/admin/crm"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Voltar ao CRM
        </Link>
      </header>

      <BotPanel />
    </section>
  );
}
