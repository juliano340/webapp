import Link from "next/link";

const cadastroLinks = [
  {
    href: "/dashboard/clientes",
    sigla: "CL",
    categoria: "Pessoas",
    titulo: "Clientes",
    descricao: "Gerencie cadastro, contato e historico de clientes.",
  },
  {
    href: "/dashboard/barbeiros",
    sigla: "BB",
    categoria: "Equipe",
    titulo: "Barbeiros",
    descricao: "Cadastre barbeiros, contatos e disponibilidade da equipe.",
  },
  {
    href: "/dashboard/servicos",
    sigla: "SV",
    categoria: "Catalogo",
    titulo: "Servicos",
    descricao: "Atualize servicos, duracao e precificacao da barbearia.",
  },
];

export default function CadastrosPage() {
  return (
    <section className="mx-auto w-full max-w-7xl">
      <header className="mb-8">
        <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Cadastros</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Centralize os acessos para clientes, barbeiros e servicos.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cadastroLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
          >
            <div className="mb-4 flex items-start justify-between">
              <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {item.sigla}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {item.categoria}
              </span>
            </div>

            <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{item.titulo}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.descricao}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
