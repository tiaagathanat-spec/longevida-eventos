"use client";

// Store temporário do módulo de Provas, em memória (Context + useState).
// Mesmo padrão dos demais módulos: substituir por Server Actions + Prisma
// quando o backend real estiver conectado.
//
// Uma "Prova" é a combinação, dentro de um evento específico, de:
// Modalidade + Categoria + Tipo de Prova (+ horário) — corresponde à
// tabela de junção `evento_modalidade_categoria` da modelagem da Etapa 2,
// estendida com o Tipo de Prova definido na Etapa 10.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

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

type ProvasContextValue = {
  provas: Prova[];
  listarPorEvento: (eventoId: string) => Prova[];
  obterPorId: (id: string) => Prova | undefined;
  criar: (dados: Omit<Prova, "id">) => Prova;
  atualizar: (id: string, dados: Omit<Prova, "id">) => void;
  excluir: (id: string) => void;
  duplicar: (id: string) => Prova | undefined;
  definirSituacao: (id: string, situacao: SituacaoProva, usuario?: string) => void;
};

const ProvasContext = createContext<ProvasContextValue | null>(null);

// Provas iniciais associadas ao evento "1" (Copa Longevida de Natação),
// usando os IDs semeados em modalidades-store e categorias-store/tipos-prova-store.
const PROVAS_INICIAIS: Prova[] = [
  {
    id: "1",
    eventoId: "1",
    modalidadeId: "1", // 50m Livre
    categoriaId: "1", // Infantil A
    tipoProvaId: "1", // Individual
    horario: "09:00",
    observacoes: "",
    valor: 120,
  },
  {
    id: "2",
    eventoId: "1",
    modalidadeId: "2", // 100m Costas
    categoriaId: "3", // Juvenil
    tipoProvaId: "1", // Individual
    horario: "09:40",
    observacoes: "",
    valor: 150,
  },
];

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function ProvasProvider({ children }: { children: ReactNode }) {
  const { dados: provas, setDados: setProvas } = usePersistencia<Prova>(
    "app_provas",
    PROVAS_INICIAIS,
    { ordem: "id" }
  );

  const value = useMemo<ProvasContextValue>(
    () => ({
      provas,
      listarPorEvento: (eventoId) => provas.filter((p) => p.eventoId === eventoId),
      obterPorId: (id) => provas.find((p) => p.id === id),
      criar: (dados) => {
        const nova: Prova = { id: gerarId(), ...dados };
        setProvas((atual) => [nova, ...atual]);
        return nova;
      },
      atualizar: (id, dados) => {
        setProvas((atual) => atual.map((p) => (p.id === id ? { id, ...dados } : p)));
      },
      excluir: (id) => {
        setProvas((atual) => atual.filter((p) => p.id !== id));
      },
      duplicar: (id) => {
        const original = provas.find((p) => p.id === id);
        if (!original) return undefined;
        const copia: Prova = {
          ...original,
          id: gerarId(),
          situacao: undefined,
          situacaoAlteradaPor: undefined,
          situacaoAlteradaEm: undefined,
        };
        setProvas((atual) => {
          const indice = atual.findIndex((p) => p.id === id);
          const novaLista = [...atual];
          novaLista.splice(indice + 1, 0, copia);
          return novaLista;
        });
        return copia;
      },
      definirSituacao: (id, situacao, usuario = "Operador") => {
        const em = new Date().toISOString();
        setProvas((atual) =>
          atual.map((p) =>
            p.id === id
              ? {
                  ...p,
                  situacao,
                  situacaoAlteradaPor: usuario,
                  situacaoAlteradaEm: em,
                }
              : p
          )
        );
      },
    }),
    [provas]
  );

  return <ProvasContext.Provider value={value}>{children}</ProvasContext.Provider>;
}

export function useProvas() {
  const ctx = useContext(ProvasContext);
  if (!ctx) {
    throw new Error("useProvas precisa ser usado dentro de <ProvasProvider>");
  }
  return ctx;
}
