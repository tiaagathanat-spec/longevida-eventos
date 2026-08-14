"use client";

// Store temporário do módulo de Dorsais, em memória (Context + useState).
// Mesmo padrão dos demais módulos: substituir por Server Actions +
// Prisma quando o backend real entrar.
//
// Uma "Faixa de Numeração" define, por evento e por grupo, o intervalo
// de números de peito disponíveis (ex: categoria "Infantil A" → 001 a 020
// no evento X). O critério de agrupamento é escolhido pelo administrador
// em cada evento: por CATEGORIA ou por IDADE (faixa etária). O sistema usa
// essas faixas para atribuir automaticamente o próximo número livre a
// cada inscrição confirmada (ver lib/mock/dorsais-auto-assign.tsx).

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";
// Lógica pura (tipos, cores, faixas etárias e cálculo de idade) vive em
// faixas-numeracao.ts e é reexportada aqui para manter compatibilidade
// com os imports existentes.
import {
  COR_FAIXA_HEX,
  COR_FAIXA_LABEL,
  FAIXAS_ETARIAS,
  faixaEtariaPara,
  idadeEm,
  resolverGrupoNumeracao,
  type CorFaixa,
  type CriterioNumeracao,
  type FaixaEtaria,
  type FaixaNumeracao,
} from "@/lib/mock/faixas-numeracao";

export {
  COR_FAIXA_HEX,
  COR_FAIXA_LABEL,
  FAIXAS_ETARIAS,
  faixaEtariaPara,
  idadeEm,
  resolverGrupoNumeracao,
  type CorFaixa,
  type CriterioNumeracao,
  type FaixaEtaria,
  type FaixaNumeracao,
};

type FaixasNumeracaoContextValue = {
  faixas: FaixaNumeracao[];
  listarPorEvento: (eventoId: string) => FaixaNumeracao[];
  obterCriterio: (eventoId: string) => CriterioNumeracao;
  definirCriterio: (eventoId: string, criterio: CriterioNumeracao) => void;
  obter: (eventoId: string, grupoId: string) => FaixaNumeracao | undefined;
  salvar: (
    eventoId: string,
    grupoId: string,
    grupoNome: string,
    dados: { numeroInicial: number; numeroFinal: number; cor: CorFaixa }
  ) => void;
};

const FaixasNumeracaoContext = createContext<FaixasNumeracaoContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function FaixasNumeracaoProvider({ children }: { children: ReactNode }) {
  const { dados: faixas, setDados: setFaixas } = usePersistencia<FaixaNumeracao>(
    "app_faixas_numeracao",
    [],
    { ordem: "id" }
  );
  const [criterios, setCriterios] = useState<Record<string, CriterioNumeracao>>({});

  const value = useMemo<FaixasNumeracaoContextValue>(
    () => ({
      faixas,
      listarPorEvento: (eventoId) => faixas.filter((f) => f.eventoId === eventoId),
      obterCriterio: (eventoId) => criterios[eventoId] ?? "categoria",
      definirCriterio: (eventoId, criterio) =>
        setCriterios((atual) => ({ ...atual, [eventoId]: criterio })),
      obter: (eventoId, grupoId) =>
        faixas.find((f) => f.eventoId === eventoId && f.grupoId === grupoId),
      salvar: (eventoId, grupoId, grupoNome, dados) => {
        setFaixas((atual) => {
          const existente = atual.find(
            (f) => f.eventoId === eventoId && f.grupoId === grupoId
          );
          if (existente) {
            return atual.map((f) =>
              f.id === existente.id ? { ...f, grupoNome, ...dados } : f
            );
          }
          const criterio = criterios[eventoId] ?? "categoria";
          return [
            ...atual,
            {
              id: gerarId(),
              eventoId,
              grupoTipo: criterio,
              grupoId,
              grupoNome,
              ...dados,
            },
          ];
        });
      },
    }),
    [faixas, criterios]
  );

  return (
    <FaixasNumeracaoContext.Provider value={value}>{children}</FaixasNumeracaoContext.Provider>
  );
}

export function useFaixasNumeracao() {
  const ctx = useContext(FaixasNumeracaoContext);
  if (!ctx) {
    throw new Error(
      "useFaixasNumeracao precisa ser usado dentro de <FaixasNumeracaoProvider>"
    );
  }
  return ctx;
}
