import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type BarbeirosPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function BarbeirosPage({ searchParams }: BarbeirosPageProps) {
  const params = (await searchParams) ?? {};
  const barbers = await prisma.barber.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-black">Barbeiros</h2>
          <p className="mt-1 text-sm text-zinc-500">Gerencie o time e os dados de contato dos profissionais.</p>
        </div>
        <a
          href="/dashboard/barbeiros/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:bg-zinc-800"
        >
          <span className="text-base">+</span>
          Adicionar Novo
        </a>
      </header>

      {params.error ? (
        <p className="rounded-lg border border-black bg-white px-4 py-3 text-sm text-black">{params.error}</p>
      ) : null}

      {params.success ? (
        <p className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-black">
          {params.success}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Barbeiro</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Telefone</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Email</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {barbers.map((barber, index) => (
                <tr key={barber.id} className="transition hover:bg-zinc-50/80">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                          index % 2 === 0 ? "bg-black/10 text-black" : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {initials(barber.name)}
                      </div>
                      <p className="font-medium text-black">{barber.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">{barber.phone}</td>
                  <td className="px-6 py-4 text-zinc-600">{barber.email ?? "-"}</td>
                  <td className="px-6 py-4 text-zinc-600">{formatDate(barber.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
