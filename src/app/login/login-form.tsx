"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Credenciais invalidas. Confira email e senha.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-600 dark:text-gray-400" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-14 w-full rounded-lg border border-gray-300 bg-white px-4 text-base text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
          placeholder="admin@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-600 dark:text-gray-400"
            htmlFor="password"
          >
            Senha
          </label>
          <button type="button" className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            Esqueci a senha
          </button>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-14 w-full rounded-lg border border-gray-300 bg-white px-4 pr-14 text-base text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-gray-200 dark:focus:ring-gray-200"
            placeholder="Digite sua senha"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((state) => !state)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium uppercase tracking-[0.1em] text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-base font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
