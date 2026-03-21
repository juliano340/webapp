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
    <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="border-b border-gray-200 bg-white px-6 py-4 lg:px-10 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white dark:bg-gray-100 dark:text-gray-900">
              BM
            </div>
            <p className="text-xl font-semibold tracking-tight dark:text-white">BarberManager</p>
          </div>
          <ThemeToggle fullWidth={false} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-10">
        <section className="w-full max-w-[460px] space-y-7 rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_28px_70px_-48px_rgba(0,0,0,0.1)] dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight dark:text-white">Bem-vindo</h1>
            <p className="text-base text-gray-500 dark:text-gray-400">
              Acesse sua conta para gerenciar sua barbearia com seguranca.
            </p>
          </div>

          <div className="aspect-video overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCDy3OHJAbt-xQh9Zqx1S5qr4ZaBAyyY5KDcAp5JuGlEo4Zth2stcSPaqYcGVI-XlxaB3LfyCQccUVc2lrZ-EWyK58pcYdSSJ95fyHYQ2PtZzWDE3QNn8L0T7d-RldG5QOXkauieYWUApv6B9LNUr8UmYicD_oVlLQQRGaXcdOM8aSrOj0hkPnkTKMhKJ1Y14pJXY2im-CFN2A3LjNW4Ame5XELQqJaO0MHppKVxq_rlChHWaYTH5Y7p93UpRsevw2eKhE6wmckMA')",
              }}
            />
          </div>

          <LoginForm />

          <div className="border-t border-gray-200 pt-4 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nao tem conta? <span className="font-semibold text-gray-900 dark:text-white">Solicite acesso</span>
            </p>
          </div>
        </section>
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-gray-400 dark:text-gray-500">
        © 2026 BarberManager. Todos os direitos reservados.
      </footer>
    </div>
  );
}
