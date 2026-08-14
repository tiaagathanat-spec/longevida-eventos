"use client";

// Store temporário do módulo de Resultados/Lançamento de tempos, em
// memória (Context + useState). Mesmo padrão dos demais módulos:
// substituir por Server Actions + Prisma quando o backend real entrar.
//
// Um "Resultado" está ligado 1:1 a uma Inscrição (conforme modelagem
// da Etapa 2) e guarda o tempo cronometrado. É preenchido pela
// Organização/Cronometragem, depois que o evento acontece.
//
// Regra central (item 10 da especificação): resultados só podem ser
// publicados após revisão/aprovação. Todo tempo lançado entra em
// "aguardando" e precisa ser aprovado (ou rejeitado, com observação)
// pelo Administrador antes de a prova poder ser publicada.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type RevisaoStatus = "aguardando" | "aprovado" | "rejeitado";

export type Resultado = {
  id: string;
  inscricaoId: string;
  tempo: string; // formato livre, ex: "00:32.45"
  observacao?: string; // usado pelo módulo Cronometragem; opcional, não afeta o módulo de lançamento existente
  revisao: RevisaoStatus; // fluxo de revisão/aprovação (regra central 10)
  revisadoPor?: string;
  revisadoEm?: string; // ISO datetime
  revisaoObservacao?: string; // motivo quando rejeitado
  // Auditoria da captura (módulo Cronometragem — itens 18/22/23):
  cronometrista?: string; // quem registrou o tempo
  capturadoEm?: string; // ISO datetime da captura
  tempoAnterior?: string; // tempo que existia antes (estado anterior), quando sobrescrito
};

type ResultadosContextValue = {
  resultados: Resultado[];
  obterPorInscricao: (inscricaoId: string) => Resultado | undefined;
  lancar: (
    inscricaoId: string,
    tempo: string,
    observacao?: string,
    cronometrista?: string
  ) => void;
  remover: (inscricaoId: string) => void;
  aprovar: (inscricaoId: string, usuario?: string) => void;
  rejeitar: (inscricaoId: string, observacao: string, usuario?: string) => void;
  voltarParaRevisao: (inscricaoId: string) => void;
};

const ResultadosContext = createContext<ResultadosContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function ResultadosProvider({ children }: { children: ReactNode }) {
  const { dados: resultados, setDados: setResultados } = usePersistencia<Resultado>(
    "app_resultados",
    [],
    { ordem: "id" }
  );

  const value = useMemo<ResultadosContextValue>(
    () => ({
      resultados,
      obterPorInscricao: (inscricaoId) =>
        resultados.find((r) => r.inscricaoId === inscricaoId),
      lancar: (inscricaoId, tempo, observacao, cronometrista) => {
        setResultados((atual) => {
          const capturadoEm = new Date().toISOString();
          const existente = atual.find((r) => r.inscricaoId === inscricaoId);
          if (existente) {
            // Tempo alterado: registra o estado anterior para auditoria e
            // volta para aguardando revisão.
            return atual.map((r) =>
              r.inscricaoId === inscricaoId
                ? {
                    ...r,
                    tempo,
                    observacao: observacao ?? existente.observacao,
                    tempoAnterior: existente.tempo,
                    cronometrista: cronometrista ?? existente.cronometrista,
                    capturadoEm: cronometrista ? capturadoEm : existente.capturadoEm,
                    revisao: "aguardando",
                    revisadoPor: undefined,
                    revisadoEm: undefined,
                    revisaoObservacao: undefined,
                  }
                : r
            );
          }
          return [
            ...atual,
            {
              id: gerarId(),
              inscricaoId,
              tempo,
              observacao,
              cronometrista,
              capturadoEm: cronometrista ? capturadoEm : undefined,
              revisao: "aguardando",
            },
          ];
        });
      },
      remover: (inscricaoId) => {
        setResultados((atual) => atual.filter((r) => r.inscricaoId !== inscricaoId));
      },
      aprovar: (inscricaoId, usuario) => {
        setResultados((atual) =>
          atual.map((r) =>
            r.inscricaoId === inscricaoId
              ? {
                  ...r,
                  revisao: "aprovado",
                  revisadoPor: usuario,
                  revisadoEm: new Date().toISOString(),
                  revisaoObservacao: undefined,
                }
              : r
          )
        );
      },
      rejeitar: (inscricaoId, observacao, usuario) => {
        setResultados((atual) =>
          atual.map((r) =>
            r.inscricaoId === inscricaoId
              ? {
                  ...r,
                  revisao: "rejeitado",
                  revisadoPor: usuario,
                  revisadoEm: new Date().toISOString(),
                  revisaoObservacao: observacao,
                }
              : r
          )
        );
      },
      voltarParaRevisao: (inscricaoId) => {
        setResultados((atual) =>
          atual.map((r) =>
            r.inscricaoId === inscricaoId
              ? {
                  ...r,
                  revisao: "aguardando",
                  revisadoPor: undefined,
                  revisadoEm: undefined,
                  revisaoObservacao: undefined,
                }
              : r
          )
        );
      },
    }),
    [resultados]
  );

  return (
    <ResultadosContext.Provider value={value}>{children}</ResultadosContext.Provider>
  );
}

export function useResultados() {
  const ctx = useContext(ResultadosContext);
  if (!ctx) {
    throw new Error("useResultados precisa ser usado dentro de <ResultadosProvider>");
  }
  return ctx;
}
