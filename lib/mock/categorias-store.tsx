"use client";

// Store temporário do módulo de Categorias, em memória (Context +
// useState). Mesmo padrão dos demais módulos: substituir por Server
// Actions + Prisma quando o backend real entrar.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type Categoria = {
  id: string;
  nome: string;
  idadeMinima: number | null;
  idadeMaxima: number | null;
  descricao: string;
};

type CategoriasContextValue = {
  categorias: Categoria[];
  pronto: boolean;
  erro: string | null;
  carregando: boolean;
  obterPorId: (id: string) => Categoria | undefined;
  criar: (dados: Omit<Categoria, "id">) => Promise<Categoria>;
  atualizar: (id: string, dados: Omit<Categoria, "id">) => Promise<void>;
  excluir: (id: string) => Promise<void>;
};

const CategoriasContext = createContext<CategoriasContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function CategoriasProvider({ children }: { children: ReactNode }) {
  const {
    dados: categorias,
    setDados: setCategorias,
    pronto,
    erro,
  } = usePersistencia<Categoria>(
    "app_categorias",
    [],
    { ordem: "id" }
  );

  const value = useMemo<CategoriasContextValue>(
    () => ({
      categorias,
      pronto,
      erro,
      carregando: false,
      obterPorId: (id) => categorias.find((c) => c.id === id),
      criar: async (dados) => {
        const nova: Categoria = { id: gerarId(), ...dados };
        setCategorias((atual) =>
          [...atual, nova].sort((a, b) => a.nome.localeCompare(b.nome))
        );
        return nova;
      },
      atualizar: async (id, dados) => {
        setCategorias((atual) =>
          atual.map((c) => (c.id === id ? { id, ...dados } : c))
        );
      },
      excluir: async (id) => {
        setCategorias((atual) => atual.filter((c) => c.id !== id));
      },
    }),
    [categorias, pronto, erro]
  );

  return (
    <CategoriasContext.Provider value={value}>{children}</CategoriasContext.Provider>
  );
}

export function useCategorias() {
  const ctx = useContext(CategoriasContext);
  if (!ctx) {
    throw new Error("useCategorias precisa ser usado dentro de <CategoriasProvider>");
  }
  return ctx;
}
