"use client";

import { useState } from "react";

type ConfirmDeleteButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  errorPath: string;
  successPath: string;
  itemLabel: string;
};

export function ConfirmDeleteButton({
  action,
  id,
  errorPath,
  successPath,
  itemLabel,
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        Excluir
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar confirmacao"
          />

          <section className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Confirmar exclusao</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Tem certeza que deseja excluir <span className="font-semibold">{itemLabel}</span>? Esta acao nao pode ser desfeita.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>

              <form action={action}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="errorPath" value={errorPath} />
                <input type="hidden" name="successPath" value={successPath} />
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Confirmar exclusao
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
