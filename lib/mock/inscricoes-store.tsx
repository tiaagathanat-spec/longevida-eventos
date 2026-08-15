"use client";

// Store temporário do módulo de Inscrições, em memória (Context + useState).
// Mesmo padrão dos demais módulos: substituir por Server Actions + Prisma
// quando o backend real estiver conectado.
//
// Uma "Inscrição" liga um atleta a uma Prova específica de um evento
// (conforme modelagem da Etapa 2). O campo `atletaNome` é um texto livre
// por enquanto — será substituído pelo relacionamento com o módulo de
// Atletas/Usuários quando ele for desenvolvido.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type InscricaoStatus = "pendente" | "confirmada" | "cancelada";

export type Inscricao = {
  id: string;
  eventoId: string;
  provaId: string;
  atletaNome: string;
  status: InscricaoStatus;
  dataInscricao: string; // ISO date
  numeroPeito?: string; // usado no módulo Financeiro; opcional, não afeta telas existentes
  // Inscrição em DUPLA: atletaNome é o participante principal (dono da
  // inscrição); atletaNome2 é o segundo participante. Persistido em
  // app_inscricoes.atleta_nome_2 (migration 0013).
  atletaNome2?: string;
};

export { nomeDaInscricao } from "./inscricoes-utils";

type InscricoesContextValue = {
  inscricoes: Inscricao[];
  pronto: boolean;
  erro: string | null;
  obterPorId: (id: string) => Inscricao | undefined;
  criar: (dados: Omit<Inscricao, "id" | "dataInscricao">) => Inscricao;
  atualizar: (id: string, dados: Partial<Omit<Inscricao, "id" | "dataInscricao">>) => void;
  alterarStatus: (id: string, status: InscricaoStatus) => void;
  excluir: (id: string) => void;
};

const InscricoesContext = createContext<InscricoesContextValue | null>(null);

// Inscrições iniciais associadas às provas semeadas em provas-store.
const INSCRICOES_INICIAIS: Inscricao[] = [
  {
    id: "1",
    eventoId: "1",
    provaId: "1",
    atletaNome: "Marina Costa",
    status: "confirmada",
    dataInscricao: "2026-07-10",
  },
  {
    id: "2",
    eventoId: "1",
    provaId: "2",
    atletaNome: "Beatriz Lima",
    status: "confirmada",
    dataInscricao: "2026-07-12",
  },
  {
    id: "3",
    eventoId: "1",
    provaId: "2",
    atletaNome: "Rafael Andrade",
    status: "pendente",
    dataInscricao: "2026-07-20",
  },
];

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function InscricoesProvider({ children }: { children: ReactNode }) {
  const {
    dados: inscricoes,
    setDados: setInscricoes,
    pronto,
    erro,
  } = usePersistencia<Inscricao>(
    "app_inscricoes",
    INSCRICOES_INICIAIS,
    { ordem: "id" }
  );

  const value = useMemo<InscricoesContextValue>(
    () => ({
      inscricoes,
      pronto,
      erro,
      obterPorId: (id) => inscricoes.find((i) => i.id === id),
      criar: (dados) => {
        const nova: Inscricao = {
          id: gerarId(),
          dataInscricao: new Date().toISOString().slice(0, 10),
          ...dados,
        };
        setInscricoes((atual) => [nova, ...atual]);
        return nova;
      },
      atualizar: (id, dados) => {
        setInscricoes((atual) =>
          atual.map((i) => (i.id === id ? { ...i, ...dados } : i))
        );
      },
      alterarStatus: (id, status) => {
        setInscricoes((atual) => atual.map((i) => (i.id === id ? { ...i, status } : i)));
      },
      excluir: (id) => {
        setInscricoes((atual) => atual.filter((i) => i.id !== id));
      },
    }),
    [inscricoes, pronto, erro]
  );

  return (
    <InscricoesContext.Provider value={value}>{children}</InscricoesContext.Provider>
  );
}

export function useInscricoes() {
  const ctx = useContext(InscricoesContext);
  if (!ctx) {
    throw new Error("useInscricoes precisa ser usado dentro de <InscricoesProvider>");
  }
  return ctx;
}
