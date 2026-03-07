import Link from "next/link";

const PARAM_SECTIONS = [
  {
    title: "Agenda e operacao",
    description: "Faixa de horarios, intervalos e regras de capacidade.",
  },
  {
    title: "Comunicacao",
    description: "Modelos de mensagem e canais de notificacao.",
  },
  {
    title: "Seguranca",
    description: "Politicas de acesso, sessao e auditoria.",
  },
];

export default function AdminParametrosPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Parametros do sistema</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Estrutura base da area de parametros administrativos.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Voltar ao Admin
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PARAM_SECTIONS.map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Em planejamento</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
