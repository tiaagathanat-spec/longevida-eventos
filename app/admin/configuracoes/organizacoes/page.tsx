"use client";

import { Building2 } from "lucide-react";
import { ORGANIZACOES_DEMO } from "@/lib/mock/funcionarios-store";

export default function OrganizacoesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Organizações</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Organizações cadastradas no sistema. Os funcionários são vinculados a uma delas
          na tela de Funcionários.
        </p>
      </header>

      {ORGANIZACOES_DEMO.map((o) => (
        <div
          key={o.id}
          className="mb-4 flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="rounded-xl bg-brand-blue/10 p-2.5">
            <Building2 className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{o.nome}</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{o.descricao}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
