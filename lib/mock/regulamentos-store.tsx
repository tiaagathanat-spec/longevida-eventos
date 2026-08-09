"use client";

// Store temporário do módulo de Regulamentos, em memória (Context + useState).
// Mesmo padrão dos demais módulos: substituir por Server Actions +
// Supabase Storage quando o backend real entrar.
//
// ARMAZENAMENTO REAL (planejado): bucket `regulamentos` no Supabase
// Storage, organizado por evento:
//   regulamentos/{eventoId}/{arquivo}
// O campo `url` guardaria a URL pública retornada pelo Storage. Por
// enquanto, guardamos o arquivo como data URL em memória (some ao
// recarregar a página), só para o fluxo de upload/visualização funcionar
// de ponta a ponta.
//
// Um "Regulamento" é um documento (PDF ou imagem) vinculado a um evento
// e disponibilizado aos atletas — pode haver vários por evento (ex:
// regulamento geral, anexo de percurso, imagens de medalha/kit).

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type TipoRegulamento = "pdf" | "imagem";

export type Regulamento = {
  id: string;
  eventoId: string;
  tipo: TipoRegulamento;
  nome: string; // nome de exibição, ex: "Regulamento 2026"
  url: string; // data URL (mock) — vira URL do Storage no backend real
  enviadoEm: string; // ISO datetime
};

type RegulamentosContextValue = {
  documentos: Regulamento[];
  listarPorEvento: (eventoId: string) => Regulamento[];
  adicionar: (dados: Omit<Regulamento, "id" | "enviadoEm">) => Regulamento;
  excluir: (id: string) => void;
};

const RegulamentosContext = createContext<RegulamentosContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function RegulamentosProvider({ children }: { children: ReactNode }) {
  const { dados: documentos, setDados: setDocumentos } = usePersistencia<Regulamento>(
    "app_regulamentos",
    [],
    { ordem: "id" }
  );

  const value = useMemo<RegulamentosContextValue>(
    () => ({
      documentos,
      listarPorEvento: (eventoId) =>
        documentos.filter((d) => d.eventoId === eventoId),
      adicionar: (dados) => {
        const novo: Regulamento = {
          id: gerarId(),
          enviadoEm: new Date().toISOString(),
          ...dados,
        };
        setDocumentos((atual) => [novo, ...atual]);
        return novo;
      },
      excluir: (id) => {
        setDocumentos((atual) => atual.filter((d) => d.id !== id));
      },
    }),
    [documentos]
  );

  return (
    <RegulamentosContext.Provider value={value}>
      {children}
    </RegulamentosContext.Provider>
  );
}

export function useRegulamentos() {
  const ctx = useContext(RegulamentosContext);
  if (!ctx) {
    throw new Error("useRegulamentos precisa ser usado dentro de <RegulamentosProvider>");
  }
  return ctx;
}
