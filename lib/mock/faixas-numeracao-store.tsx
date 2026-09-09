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

import { createContext, useContext, useEffect, useMemo, ReactNode } from "react";
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
  pronto: boolean;
  erro: string | null;
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

// Linha da tabela-espelho app_criterio_numeracao (migration 0021): o
// critério de numeração escolhido por evento, persistido para valer entre
// recargas de página.
type LinhaCriterioNumeracao = { eventoId: string; criterio: CriterioNumeracao };

export function FaixasNumeracaoProvider({ children }: { children: ReactNode }) {
  const {
    dados: faixas,
    setDados: setFaixas,
    pronto,
    erro,
  } = usePersistencia<FaixaNumeracao>(
    "app_faixas_numeracao",
    [],
    { ordem: "id" }
  );
  // Critério de numeração por evento também é persistido (tabela
  // app_criterio_numeracao, migration 0021) para a escolha feita na tela
  // valer após recarregar, sem depender de ajuste manual no banco.
  const {
    dados: criteriosLinhas,
    setDados: setCriteriosLinhas,
    pronto: criteriosPronto,
  } = usePersistencia<LinhaCriterioNumeracao>(
    "app_criterio_numeracao",
    [],
    { ordem: "evento_id" }
  );

  const criterios = useMemo(() => {
    const mapa: Record<string, CriterioNumeracao> = {};
    for (const linha of criteriosLinhas) mapa[linha.eventoId] = linha.criterio;
    return mapa;
  }, [criteriosLinhas]);

  // Ao carregar, descarta faixas cujo tipo não corresponde ao critério
  // persistido do evento (sobras de trocas de critério anteriores). A
  // remoção é sincronizada com o banco pela camada de persistência.
  useEffect(() => {
    if (!pronto || !criteriosPronto) return;
    setFaixas((atual) => {
      const invalidas = atual.filter(
        (f) => criterios[f.eventoId] && f.grupoTipo !== criterios[f.eventoId]
      );
      if (invalidas.length === 0) return atual;
      const idsInvalidadas = new Set(invalidas.map((f) => f.id));
      return atual.filter((f) => !idsInvalidadas.has(f.id));
    });
  }, [pronto, criteriosPronto, criterios, setFaixas]);

  const value = useMemo<FaixasNumeracaoContextValue>(
    () => ({
      faixas,
      pronto,
      erro,
      listarPorEvento: (eventoId) => faixas.filter((f) => f.eventoId === eventoId),
      obterCriterio: (eventoId) => criterios[eventoId] ?? "categoria",
      definirCriterio: (eventoId, criterio) => {
        const anterior = criterios[eventoId] ?? "categoria";
        if (anterior === criterio) return;
        setCriteriosLinhas((atual) => {
          const demais = atual.filter((r) => r.eventoId !== eventoId);
          return [...demais, { eventoId, criterio }];
        });
        // Troca de critério: as faixas do outro tipo pertencem a outro
        // esquema de numeração e deixam de fazer sentido — são removidas
        // (e a remoção também é sincronizada com o banco).
        setFaixas((atual) =>
          atual.filter(
            (f) => !(f.eventoId === eventoId && f.grupoTipo !== criterio)
          )
        );
      },
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
    [faixas, criterios, pronto, erro]
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
