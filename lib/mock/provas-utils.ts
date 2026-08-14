// Lógica pura (sem React) do módulo de Provas: tipos e helpers de
// situação de realização e de identificação do atleta. Separada da store
// (provas-store.tsx) para que as regras possam ser testadas isoladamente.

export type TipoIdentificacaoProva = "dorsal" | "card";

// Situação de realização da prova no dia do evento. "encerrada" é a
// prova realizada (resultados liberados). A transição é auditada com
// quem alterou e quando.
export type SituacaoProva = "nao_iniciada" | "em_andamento" | "encerrada";

export type Prova = {
  id: string;
  eventoId: string;
  modalidadeId: string;
  categoriaId: string;
  tipoProvaId: string;
  horario: string; // "HH:mm", opcional
  observacoes: string;
  valor: number; // valor da inscrição desta prova, em reais
  // Identificação do atleta nesta prova: "dorsal" (número de peito) ou
  // "card" (credencial oficial 8,5x5,5cm). Ausente = dorsal (padrão).
  tipoIdentificacao?: TipoIdentificacaoProva;
  // Situação de realização da prova. Ausente = "nao_iniciada".
  situacao?: SituacaoProva;
  situacaoAlteradaPor?: string;
  situacaoAlteradaEm?: string; // ISO datetime
};

export function identificacaoDaProva(prova?: Prova): TipoIdentificacaoProva {
  return prova?.tipoIdentificacao ?? "dorsal";
}

export function situacaoDaProva(prova?: Prova): SituacaoProva {
  return prova?.situacao ?? "nao_iniciada";
}

export const SITUACAO_PROVA_LABEL: Record<SituacaoProva, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  encerrada: "Realizada",
};

export const SITUACAO_PROVA_CLASSE: Record<SituacaoProva, string> = {
  nao_iniciada: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  em_andamento: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  encerrada: "bg-brand-green/10 text-brand-green",
};
