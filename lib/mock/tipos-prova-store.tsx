"use client";

// Store temporário do módulo de Tipos de Prova, em memória (Context +
// useState). Mesmo padrão dos demais módulos: substituir por Server
// Actions + Prisma quando o backend real entrar.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type TipoProva = {
  id: string;
  nome: string;
  permiteEquipe: boolean;
  // Quantos participantes cada formação exige (1 = individual; 2 =
  // dupla; 4 = quartetos, etc.). Usado pelas telas de inscrição para
  // saber quantos integrantes coletar. Persistido em
  // app_tipos_prova.integrantes (migration 0017).
  integrantes: number;
  descricao: string;
};

type TiposProvaContextValue = {
  tiposProva: TipoProva[];
  pronto: boolean;
  erro: string | null;
  carregando: boolean;
  obterPorId: (id: string) => TipoProva | undefined;
  criar: (dados: Omit<TipoProva, "id">) => Promise<TipoProva>;
  atualizar: (id: string, dados: Omit<TipoProva, "id">) => Promise<void>;
  excluir: (id: string) => Promise<void>;
};

const TiposProvaContext = createContext<TiposProvaContextValue | null>(null);

// Um tipo de prova é de DUPLA pelo nome "Dupla" (id "dupla"). Usado pelas
// telas de inscrição: não checamos permiteEquipe, pois "Revezamento"
// também tem permiteEquipe = true.
export function eTipoDupla(tipoProva: Pick<TipoProva, "nome"> | undefined) {
  return tipoProva?.nome.toLowerCase() === "dupla";
}

// Quantos participantes a prova exige (1 = individual, 2 = dupla,
// 4 = quarteto...). Deriva do campo `integrantes` do tipo de prova;
// ausente/zerado vira 1.
export function integrantesDaProva(
  tipoProva: Pick<TipoProva, "integrantes"> | undefined
): number {
  const n = tipoProva?.integrantes ?? 0;
  return n >= 1 ? n : 1;
}

// A prova é disputada em equipe (2 ou mais integrantes)?
export function eProvaEmEquipe(
  tipoProva: Pick<TipoProva, "permiteEquipe" | "integrantes"> | undefined
): boolean {
  return integrantesDaProva(tipoProva) > 1;
}

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function TiposProvaProvider({ children }: { children: ReactNode }) {
  const {
    dados: tiposProva,
    setDados: setTiposProva,
    pronto,
    erro,
  } = usePersistencia<TipoProva>(
    "app_tipos_prova",
    [],
    { ordem: "id" }
  );

  const value = useMemo<TiposProvaContextValue>(
    () => ({
      tiposProva,
      pronto,
      erro,
      carregando: false,
      obterPorId: (id) => tiposProva.find((t) => t.id === id),
      criar: async (dados) => {
        const novo: TipoProva = { id: gerarId(), ...dados };
        setTiposProva((atual) =>
          [...atual, novo].sort((a, b) => a.nome.localeCompare(b.nome))
        );
        return novo;
      },
      atualizar: async (id, dados) => {
        setTiposProva((atual) =>
          atual.map((t) => (t.id === id ? { id, ...dados } : t))
        );
      },
      excluir: async (id) => {
        setTiposProva((atual) => atual.filter((t) => t.id !== id));
      },
    }),
    [tiposProva, pronto, erro]
  );

  return (
    <TiposProvaContext.Provider value={value}>{children}</TiposProvaContext.Provider>
  );
}

export function useTiposProva() {
  const ctx = useContext(TiposProvaContext);
  if (!ctx) {
    throw new Error("useTiposProva precisa ser usado dentro de <TiposProvaProvider>");
  }
  return ctx;
}
