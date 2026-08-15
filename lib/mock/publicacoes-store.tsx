"use client";

// Store temporário do módulo de Publicação de Resultados, em memória
// (Context + useState). Mesmo padrão dos demais módulos: substituir por
// Server Actions + Prisma quando o backend real entrar.
//
// Controla, por prova, se a classificação já foi tornada oficial
// (publicada). Enquanto não publicada, os tempos podem ser corrigidos
// livremente pela Organização; depois de publicada, os tempos ficam
// travados para edição — reflete o fluxo real de cronometragem, onde a
// publicação é o momento em que o resultado passa a valer oficialmente.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type Publicacao = {
  provaId: string;
  publicadoEm: string; // ISO datetime
};

type PublicacoesContextValue = {
  publicacoes: Publicacao[];
  pronto: boolean;
  erro: string | null;
  estaPublicado: (provaId: string) => boolean;
  obterDataPublicacao: (provaId: string) => string | undefined;
  publicar: (provaId: string) => void;
  despublicar: (provaId: string) => void;
};

const PublicacoesContext = createContext<PublicacoesContextValue | null>(null);

export function PublicacoesProvider({ children }: { children: ReactNode }) {
  const {
    dados: publicacoes,
    setDados: setPublicacoes,
    pronto,
    erro,
  } = usePersistencia<Publicacao>(
    "app_publicacoes",
    [],
    { idCampo: "provaId", idColuna: "prova_id" }
  );

  const value = useMemo<PublicacoesContextValue>(
    () => ({
      publicacoes,
      pronto,
      erro,
      estaPublicado: (provaId) => publicacoes.some((p) => p.provaId === provaId),
      obterDataPublicacao: (provaId) =>
        publicacoes.find((p) => p.provaId === provaId)?.publicadoEm,
      publicar: (provaId) => {
        setPublicacoes((atual) => {
          if (atual.some((p) => p.provaId === provaId)) return atual;
          return [...atual, { provaId, publicadoEm: new Date().toISOString() }];
        });
      },
      despublicar: (provaId) => {
        setPublicacoes((atual) => atual.filter((p) => p.provaId !== provaId));
      },
    }),
    [publicacoes, pronto, erro]
  );

  return (
    <PublicacoesContext.Provider value={value}>{children}</PublicacoesContext.Provider>
  );
}

export function usePublicacoes() {
  const ctx = useContext(PublicacoesContext);
  if (!ctx) {
    throw new Error("usePublicacoes precisa ser usado dentro de <PublicacoesProvider>");
  }
  return ctx;
}
