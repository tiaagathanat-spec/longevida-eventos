"use client";

import { useState } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { tentarReconciliarAgora } from "@/lib/supabase/persistencia";

// Banner que expõe falhas de sincronização da persistência. A camada
// (lib/supabase/persistencia) nunca oculta um erro de INSERT/UPDATE/
// DELETE: quando um cadastro não foi salvo no banco, o motivo aparece
// aqui para a tela não "aparentar salvar" e o dado sumir ao recarregar.
//
// Falhas de rede guardam os dados na fila offline, que é reconciliada
// automaticamente (a cada 15s e no evento `online`). O botão "Tentar
// novamente" força uma passada na fila imediatamente.
export function AlertaPersistencia({ erro }: { erro: string | null }) {
  const [tentando, setTentando] = useState(false);

  if (!erro) return null;

  async function tentarAgora() {
    setTentando(true);
    try {
      await tentarReconciliarAgora();
    } finally {
      setTentando(false);
    }
  }

  return (
    <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Suas alterações ainda não foram salvas</p>
        <p className="mt-0.5">{erro}</p>
        <button
          type="button"
          onClick={tentarAgora}
          disabled={tentando}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
        >
          <RotateCw className={`h-3.5 w-3.5 ${tentando ? "animate-spin" : ""}`} />
          {tentando ? "Tentando…" : "Tentar novamente"}
        </button>
      </div>
    </div>
  );
}