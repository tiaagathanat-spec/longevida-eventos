"use client";

// Store temporário do módulo Dorsais, em memória (Context + useState).
// Mesmo padrão dos demais módulos: substituir por Server Actions +
// Prisma quando o backend real entrar (provavelmente um campo
// `numero_peito` + `medalha_entregue` + `alimentacao_entregue` na
// própria tabela `inscricoes`, ou uma tabela `dorsais` 1:1).
//
// Um "Dorsal" é o número de peito atribuído a uma inscrição confirmada,
// junto com os dois controles operacionais do dia do evento (entrega de
// medalha e de alimentação). A atribuição do número em si é feita
// automaticamente por lib/mock/dorsais-auto-assign.tsx — este store só
// guarda o resultado e permite atualizar os controles.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type Dorsal = {
  id: string;
  inscricaoId: string;
  numero: number;
  checkInFeito: boolean;
  medalhaEntregue: boolean;
  alimentacaoEntregue: boolean;
  kitEntregue: boolean;
  atribuidoEm: string; // ISO datetime
};

type DorsaisContextValue = {
  dorsais: Dorsal[];
  obterPorInscricao: (inscricaoId: string) => Dorsal | undefined;
  registrar: (inscricaoId: string, numero: number) => Dorsal;
  atualizarControles: (
    inscricaoId: string,
    dados: Partial<Pick<Dorsal, "checkInFeito" | "medalhaEntregue" | "alimentacaoEntregue" | "kitEntregue">>
  ) => void;
};

const DorsaisContext = createContext<DorsaisContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function DorsaisProvider({ children }: { children: ReactNode }) {
  const { dados: dorsais, setDados: setDorsais } = usePersistencia<Dorsal>(
    "app_dorsais",
    [],
    { ordem: "id" }
  );

  const value = useMemo<DorsaisContextValue>(
    () => ({
      dorsais,
      obterPorInscricao: (inscricaoId) =>
        dorsais.find((d) => d.inscricaoId === inscricaoId),
      registrar: (inscricaoId, numero) => {
        const novo: Dorsal = {
          id: gerarId(),
          inscricaoId,
          numero,
          checkInFeito: false,
          medalhaEntregue: false,
          alimentacaoEntregue: false,
          kitEntregue: false,
          atribuidoEm: new Date().toISOString(),
        };
        setDorsais((atual) => [...atual, novo]);
        return novo;
      },
      atualizarControles: (inscricaoId, dados) => {
        setDorsais((atual) =>
          atual.map((d) => (d.inscricaoId === inscricaoId ? { ...d, ...dados } : d))
        );
      },
    }),
    [dorsais]
  );

  return <DorsaisContext.Provider value={value}>{children}</DorsaisContext.Provider>;
}

export function useDorsais() {
  const ctx = useContext(DorsaisContext);
  if (!ctx) {
    throw new Error("useDorsais precisa ser usado dentro de <DorsaisProvider>");
  }
  return ctx;
}
