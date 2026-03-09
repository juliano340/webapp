import Link from "next/link";

export default async function AdminPage() {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Area administrativa</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Recursos exclusivos para administradores do sistema.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/dashboard/admin/logs"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Auditoria</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">Logs internos</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Consultar eventos de insert, update e delete.</p>
        </Link>

        <Link
          href="/dashboard/admin/comissoes"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Financeiro</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">Comissionamento</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Regras por barbeiro/servico e relatorios comparativos.</p>
        </Link>

        <Link
          href="/dashboard/admin/crm"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Relacionamento</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">CRM e Lembretes</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Automações de aniversario e pos-servico com fila operacional.</p>
        </Link>

        <Link
          href="/dashboard/admin/solicitacoes"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Agendamentos</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">Solicitacoes pendentes</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Fila de aprovação dos pedidos feitos no portal do cliente.</p>
        </Link>

        <Link
          href="/dashboard/admin/usuarios"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Acessos</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">Usuarios e perfis</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Gerenciar privilegios administrativos do sistema.</p>
        </Link>

        <Link
          href="/dashboard/admin/parametros"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Configuracoes</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">Parametros do sistema</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Central de parametros administrativos e operacionais.</p>
        </Link>

        <article className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Em breve</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900 dark:text-white">Mais ferramentas</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Espaço preparado para novos recursos administrativos.
          </p>
        </article>
      </div>
    </section>
  );
}
