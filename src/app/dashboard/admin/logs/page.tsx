import Link from "next/link";
import { AuditOperation } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LogsPageProps = {
  searchParams?: Promise<{ operation?: string; from?: string; to?: string }>;
};

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseDateBoundary(value: string, kind: "from" | "to"): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }

  if (kind === "to") {
    parsed.setDate(parsed.getDate() + 1);
  }

  return parsed;
}

export default async function AdminLogsPage({ searchParams }: LogsPageProps) {
  const params = (await searchParams) ?? {};
  const operation =
    params.operation === AuditOperation.INSERT ||
    params.operation === AuditOperation.UPDATE ||
    params.operation === AuditOperation.DELETE
      ? params.operation
      : "";
  const fromDate = params.from ? parseDateBoundary(params.from, "from") : null;
  const toDateExclusive = params.to ? parseDateBoundary(params.to, "to") : null;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(operation ? { operation } : {}),
      ...(fromDate || toDateExclusive
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDateExclusive ? { lt: toDateExclusive } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Logs internos</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Auditoria de insert, update e delete dos cadastros. Acesso restrito a administradores.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Voltar ao Admin
        </Link>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <form className="grid gap-3 md:grid-cols-4">
          <select
            name="operation"
            defaultValue={operation}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          >
            <option value="">Todas operacoes</option>
            <option value={AuditOperation.INSERT}>INSERT</option>
            <option value={AuditOperation.UPDATE}>UPDATE</option>
            <option value={AuditOperation.DELETE}>DELETE</option>
          </select>

          <input
            name="from"
            type="date"
            defaultValue={params.from ?? ""}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          />

          <input
            name="to"
            type="date"
            defaultValue={params.to ?? ""}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Filtrar
            </button>
            <Link
              href="/dashboard/admin/logs"
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Limpar
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Data</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Operacao</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Entidade</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">ID registro</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Administrador</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-gray-500 dark:text-gray-400">
                    Sem registros para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{formatDateTime(log.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {log.operation}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{log.entityType}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{log.entityId}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{log.actorEmail}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
