"use client";

// Tabela de classificação por grupos (categoria · faixa etária · sexo),
// com a trava de oficialização: enquanto a prova não estiver encerrada e
// os resultados não forem publicados, o ranking é exibido como
// PROVISÓRIO — sem medalhas. Só quando `oficial` é true o pódio (1º, 2º,
// 3º) é definido.

import { Lock, Medal, Trophy } from "lucide-react";
import type { ItemClassificacao } from "@/lib/mock/classificacao";
import { nomeDaInscricao, type Inscricao } from "@/lib/mock/inscricoes-store";

export type GrupoClassificacaoExibicao = {
  chave: string;
  rotulo: string;
  classificacao: ItemClassificacao<Inscricao>[];
};

const MEDALHA: Record<number, string> = {
  1: "text-amber-500",
  2: "text-slate-400",
  3: "text-orange-700",
};

function formatarTempo(segundos: number) {
  const min = Math.floor(segundos / 60);
  const resto = segundos - min * 60;
  return `${String(min).padStart(2, "0")}:${resto.toFixed(2).padStart(5, "0")}`;
}

export function TabelaClassificacaoGrupos({
  grupos,
  oficial,
}: {
  grupos: GrupoClassificacaoExibicao[];
  oficial: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {!oficial && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock className="h-4 w-4 shrink-0" />
          Classificação provisória — medalhas e ranking oficial só são definidos após o
          encerramento da prova e a publicação dos resultados.
        </div>
      )}
      {grupos.map((grupo) => (
        <div
          key={grupo.chave}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
            <Trophy className="h-4 w-4 text-brand-blue" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {grupo.rotulo}
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-2 font-medium">Colocação</th>
                <th className="px-4 py-2 font-medium">Peito</th>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Tempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {grupo.classificacao.map(({ colocacao, item, segundos }) => (
                <tr
                  key={item.id}
                  className={oficial && colocacao <= 3 ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}
                >
                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">
                    {oficial && colocacao <= 3 ? (
                      <span className={`inline-flex items-center gap-1 ${MEDALHA[colocacao]}`}>
                        <Medal className="h-4 w-4" />
                        {colocacao}º
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">{colocacao}º</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {item.numeroPeito || "—"}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                    {nomeDaInscricao(item)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                    {formatarTempo(segundos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
