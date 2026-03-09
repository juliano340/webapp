import { BookingRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PendingRequestsPanel } from "./pending-requests-panel";

export default async function AdminSolicitacoesPage() {
  const pendingRequests = await prisma.bookingRequest.findMany({
    where: { status: BookingRequestStatus.PENDING },
    include: {
      customer: {
        select: { id: true, name: true, phoneE164: true },
      },
      service: {
        select: { id: true, name: true, durationInMinutes: true },
      },
      barber: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const initialItems = pendingRequests.map((item) => ({
    ...item,
    requestedStartAt: item.requestedStartAt.toISOString(),
    requestedEndAt: item.requestedEndAt.toISOString(),
  }));

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Solicitacoes de agendamento</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Aprove ou rejeite pedidos enviados pelos clientes no portal WhatsApp.
        </p>
      </header>

      <PendingRequestsPanel initialItems={initialItems} />
    </section>
  );
}
