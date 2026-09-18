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

// Controles operacionais do dia do evento, auditados: cada alteração
// registra quem fez e quando, para rastreabilidade (segurança).
export type ChaveControleDorsal =
  | "checkInFeito"
  | "kitEntregue"
  | "medalhaEntregue"
  | "alimentacaoEntregue";

export type RegistroAuditoriaDorsal = {
  chave: ChaveControleDorsal;
  valor: boolean;
  usuario: string;
  em: string; // ISO datetime
};

export type Dorsal = {
  id: string;
  inscricaoId: string;
  provaId: string;
  numero: number;
  checkInFeito: boolean;
  medalhaEntregue: boolean;
  alimentacaoEntregue: boolean;
  kitEntregue: boolean;
  atribuidoEm: string; // ISO datetime
  auditoria: RegistroAuditoriaDorsal[];
};

// Retorna o último registro de auditoria de um controle (ou undefined).
export function obterUltimaAuditoria(
  dorsal: Dorsal | null | undefined,
  chave: ChaveControleDorsal
): RegistroAuditoriaDorsal | undefined {
  const lista = dorsal?.auditoria ?? [];
  for (let i = lista.length - 1; i >= 0; i--) {
    if (lista[i].chave === chave) return lista[i];
  }
  return undefined;
}

type DorsaisContextValue = {
  dorsais: Dorsal[];
  pronto: boolean;
  erro: string | null;
  obterPorInscricao: (inscricaoId: string) => Dorsal | undefined;
  registrar: (inscricaoId: string, numero: number, provaId: string) => Dorsal;
  atualizarNumero: (inscricaoId: string, numero: number) => void;
  atualizarNumeroDoDorsal: (dorsalId: string, numero: number) => void;
  atualizarControles: (
    inscricaoId: string,
    dados: Partial<Pick<Dorsal, ChaveControleDorsal>>,
    usuario?: string
  ) => void;
};

const DorsaisContext = createContext<DorsaisContextValue | null>(null);

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function DorsaisProvider({ children }: { children: ReactNode }) {
  const {
    dados: dorsais,
    setDados: setDorsais,
    pronto,
    erro,
  } = usePersistencia<Dorsal>(
    "app_dorsais",
    [],
    { ordem: "id" }
  );

  const value = useMemo<DorsaisContextValue>(
    () => ({
      dorsais,
      pronto,
      erro,
      obterPorInscricao: (inscricaoId) =>
        dorsais.find((d) => d.inscricaoId === inscricaoId),
      registrar: (inscricaoId, numero, provaId) => {
        const em = new Date().toISOString();
        // Idempotente por (inscrição + prova): se já existe dorsal para
        // essa combinação, atualiza o número em vez de criar outra linha —
        // a tabela tem UNIQUE(prova_id, numero) e cada inscrição deve ter
        // NO MÁXIMO um dorsal por prova. Sem isso, execuções repetidas
        // acumulariam dorsais duplicados e esbarrariam na constraint.
        const existente = dorsais.find(
          (d) => d.inscricaoId === inscricaoId && d.provaId === provaId
        );
        if (existente) {
          setDorsais((atual) =>
            atual.map((d) =>
              d.id === existente.id ? { ...d, numero, atribuidoEm: em } : d
            )
          );
          return existente;
        }
        const novo: Dorsal = {
          id: gerarId(),
          inscricaoId,
          provaId,
          numero,
          checkInFeito: false,
          medalhaEntregue: false,
          alimentacaoEntregue: false,
          kitEntregue: false,
          atribuidoEm: em,
          auditoria: [],
        };
        setDorsais((atual) => [...atual, novo]);
        return novo;
      },
      atualizarNumero: (inscricaoId, numero) => {
        setDorsais((atual) =>
          atual.map((d) =>
            d.inscricaoId === inscricaoId ? { ...d, numero } : d
          )
        );
      },
      atualizarNumeroDoDorsal: (dorsalId, numero) => {
        setDorsais((atual) =>
          atual.map((d) => (d.id === dorsalId ? { ...d, numero } : d))
        );
      },
      atualizarControles: (inscricaoId, dados, usuario = "Operador") => {
        const em = new Date().toISOString();
        setDorsais((atual) =>
          atual.map((d) => {
            if (d.inscricaoId !== inscricaoId) return d;
            const entradas = (Object.keys(dados) as ChaveControleDorsal[])
              .filter((chave) => typeof dados[chave] === "boolean")
              .map((chave) => ({
                chave,
                valor: dados[chave] as boolean,
                usuario,
                em,
              }));
            return {
              ...d,
              ...dados,
              auditoria: [...(d.auditoria ?? []), ...entradas],
            };
          })
        );
      },
    }),
    [dorsais, pronto, erro]
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
