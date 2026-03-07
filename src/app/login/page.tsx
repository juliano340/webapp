import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f8] text-black dark:bg-[#0b1220] dark:text-white">
      <header className="border-b border-zinc-200 px-6 py-4 lg:px-10 dark:border-slate-700">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black">BM</div>
            <p className="text-xl font-semibold tracking-tight dark:text-white">BarberManager</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-10">
        <section className="w-full max-w-[460px] space-y-7 rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_28px_70px_-48px_rgba(0,0,0,0.42)] dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight dark:text-white">Bem-vindo</h1>
            <p className="text-base text-zinc-600 dark:text-slate-400">
              Acesse sua conta para gerenciar sua barbearia com seguranca.
            </p>
          </div>

          <div className="aspect-video overflow-hidden rounded-xl border border-zinc-200 dark:border-slate-700">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCDy3OHJAbt-xQh9Zqx1S5qr4ZaBAyyY5KDcAp5JuGlEo4Zth2stcSPaqYcGVI-XlxaB3LfyCQccUVc2lrZ-EWyK58pcYdSSJ95fyHYQ2PtZzWDE3QNn8L0T7d-RldG5QOXkauieYWUApv6B9LNUr8UmYicD_oVlLQQRGaXcdOM8aSrOj0hkPnkTKMhKJ1Y14pJXY2im-CFN2A3LjNW4Ame5XELQqJaO0MHppKVxq_rlChHWaYTH5Y7p93UpRsevw2eKhE6wmckMA')",
              }}
            />
          </div>

          <LoginForm />

          <div className="border-t border-zinc-200 pt-4 text-center dark:border-slate-700">
            <p className="text-sm text-zinc-500 dark:text-slate-400">
              Nao tem conta? <span className="font-semibold text-black dark:text-white">Solicite acesso</span>
            </p>
          </div>
        </section>
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-zinc-500 dark:text-slate-400">
        © 2026 BarberManager. Todos os direitos reservados.
      </footer>
    </div>
  );
}
