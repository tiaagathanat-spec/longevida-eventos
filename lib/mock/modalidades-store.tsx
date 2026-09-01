"use client";

// Store temporário do módulo de Modalidades, em memória (Context +
// useState). Mesmo padrão dos demais módulos: substituir por Server
// Actions + Prisma quando o backend real entrar.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type Estilo = "livre" | "costas" | "peito" | "borboleta" | "medley";

export type Modalidade = {
  id: string;
  nome: string;
  estilo: Estilo;
  distanciaMetros: number | null;
  descricao: string;
};

type ModalidadesContextValue = {
  modalidades: Modalidade[];
  pronto: boolean;
  erro: string | null;
  carregando: boolean;
  obterPorId: (id: string) => Modalidade | undefined;
  criar: (dados: Omit<Modalidade, "id">) => Promise<Modalidade>;
  atualizar: (id: string, dados: Omit<Modalidade, "id">) => Promise<void>;
  excluir: (id: string) => Promise<void>;
};

const ModalidadesContext = createContext<ModalidadesContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function ModalidadesProvider({ children }: { children: ReactNode }) {
  const {
    dados: modalidades,
    setDados: setModalidades,
    pronto,
    erro,
  } = usePersistencia<Modalidade>(
    "app_modalidades",
    [],
    { ordem: "id" }
  );

  const value = useMemo<ModalidadesContextValue>(
    () => ({
      modalidades,
      pronto,
      erro,
      carregando: false,
      obterPorId: (id) => modalidades.find((m) => m.id === id),
      criar: async (dados) => {
        const nova: Modalidade = { id: gerarId(), ...dados };
        setModalidades((atual) =>
          [...atual, nova].sort((a, b) => a.nome.localeCompare(b.nome))
        );
        return nova;
      },
      atualizar: async (id, dados) => {
        setModalidades((atual) =>
          atual.map((m) => (m.id === id ? { id, ...dados } : m))
        );
      },
      excluir: async (id) => {
        setModalidades((atual) => atual.filter((m) => m.id !== id));
      },
    }),
    [modalidades, pronto, erro]
  );

  return (
    <ModalidadesContext.Provider value={value}>{children}</ModalidadesContext.Provider>
  );
}

export function useModalidades() {
  const ctx = useContext(ModalidadesContext);
  if (!ctx) {
    throw new Error("useModalidades precisa ser usado dentro de <ModalidadesProvider>");
  }
  return ctx;
}
