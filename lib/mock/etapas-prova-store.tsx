"use client";

// Store do módulo de Etapas/Percursos de Prova (Relatórios Operacionais).
//
// As "etapas" descrevem, por PROVA, o que cada participante executa:
// função, nome do percurso/etapa e distância. Persistido em
// app_prova_etapas (migration 0022). Em provas individuais sem etapas
// configuradas, o relatório deriva a informação da Modalidade da prova —
// por isso aqui não há regra por evento/prova, apenas configuração.

import { createContext, useContext, useMemo, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type EtapaProva = {
  id: string;
  provaId: string;
  // Qual participante da inscrição executa (1 = atleta principal; 2, 3,
  // 4 = integrantes seguintes). Em prova individual é sempre 1.
  posicao: number;
  // Papel do participante nesta etapa (ex.: "Nadador", "Corredor").
  funcao: string;
  // Nome do percurso/etapa (ex.: "Natação", "Corrida").
  nome: string;
  // Ordem de exibição das etapas.
  ordem: number;
  // Distância em metros. null/0 = não informada ("a definir").
  distanciaMetros: number | null;
  // Unidade usada apenas para formatação: "m" | "km".
  unidade: string;
  descricao: string;
};

type EtapasProvaContextValue = {
  etapas: EtapaProva[];
  pronto: boolean;
  erro: string | null;
  listarPorProva: (provaId: string) => EtapaProva[];
  // Substitui todas as etapas de uma prova pelas etapas informadas.
  salvarEtapas: (provaId: string, etapas: Omit<EtapaProva, "id" | "provaId">[]) => void;
};

const EtapasProvaContext = createContext<EtapasProvaContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function EtapasProvaProvider({ children }: { children: ReactNode }) {
  const {
    dados: etapas,
    setDados: setEtapas,
    pronto,
    erro,
  } = usePersistencia<EtapaProva>("app_prova_etapas", [], { ordem: "ordem" });

  const value = useMemo<EtapasProvaContextValue>(
    () => ({
      etapas,
      pronto,
      erro,
      listarPorProva: (provaId) =>
        etapas
          .filter((e) => e.provaId === provaId)
          .sort((a, b) => a.ordem - b.ordem || a.posicao - b.posicao),
      salvarEtapas: (provaId, novas) => {
        setEtapas((atual) => {
          const removidas = atual.filter((e) => e.provaId !== provaId);
          const adicionadas = novas.map((e) => ({
            id: gerarId(),
            provaId,
            ...e,
          }));
          return [...removidas, ...adicionadas];
        });
      },
    }),
    [etapas, pronto, erro]
  );

  return (
    <EtapasProvaContext.Provider value={value}>{children}</EtapasProvaContext.Provider>
  );
}

export function useEtapasProva() {
  const ctx = useContext(EtapasProvaContext);
  if (!ctx) {
    throw new Error("useEtapasProva precisa ser usado dentro de <EtapasProvaProvider>");
  }
  return ctx;
}