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
  descricao: string;
};

type TiposProvaContextValue = {
  tiposProva: TipoProva[];
  carregando: boolean;
  obterPorId: (id: string) => TipoProva | undefined;
  criar: (dados: Omit<TipoProva, "id">) => Promise<TipoProva>;
  atualizar: (id: string, dados: Omit<TipoProva, "id">) => Promise<void>;
  excluir: (id: string) => Promise<void>;
};

const TiposProvaContext = createContext<TiposProvaContextValue | null>(null);

// Tipos de prova iniciais. O ID "1" (Individual) é referenciado pelas
// provas semeadas em provas-store.
const TIPOS_PROVA_INICIAIS: TipoProva[] = [
  {
    id: "1",
    nome: "Individual",
    permiteEquipe: false,
    descricao: "Prova disputada individualmente por atleta.",
  },
  {
    id: "2",
    nome: "Revezamento",
    permiteEquipe: true,
    descricao: "Prova disputada em equipes de revezamento.",
  },
];

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function TiposProvaProvider({ children }: { children: ReactNode }) {
  const { dados: tiposProva, setDados: setTiposProva } = usePersistencia<TipoProva>(
    "app_tipos_prova",
    TIPOS_PROVA_INICIAIS,
    { ordem: "id" }
  );

  const value = useMemo<TiposProvaContextValue>(
    () => ({
      tiposProva,
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
    [tiposProva]
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
