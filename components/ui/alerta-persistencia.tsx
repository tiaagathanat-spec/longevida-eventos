"use client";

import { AlertTriangle } from "lucide-react";

// Banner que expõe falhas de sincronização da persistência. A camada
// (lib/supabase/persistencia) nunca oculta um erro de INSERT/UPDATE/
// DELETE: quando um cadastro não foi salvo no banco, o motivo aparece
// aqui para a tela não "aparentar salvar" e o dado sumir ao recarregar.
export function AlertaPersistencia({ erro }: { erro: string | null }) {
  if (!erro) return null;
  return (
    <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Suas alterações ainda não foram salvas</p>
        <p className="mt-0.5">{erro}</p>
      </div>
    </div>
  );
}
