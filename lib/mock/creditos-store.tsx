"use client";

// Store do CRÉDITO PRÉ-EXISTENTE do cliente (Context + useState),
// persistido no Supabase em `app_creditos` (saldo atual) e
// `app_credito_movimentacoes` (histórico de movimentações).
//
// O crédito é um SALDO do cliente — não é entrada financeira nova.
// Quando uma inscrição é paga com a forma "credito", o valor usado é
// abatido do saldo e registrado como movimentação "utilizado" ligada à
// inscrição. Editar/cancelar um pagamento que usou crédito devolve o
// valor ao saldo por uma movimentação "estornado".
//
// Integridade: a utilização nunca deixa o saldo negativo (a lógica pura
// em lib/financeiro/creditos-utils lança erro; o banco também tem CHECK
// saldo >= 0). O estorno evita perda ou dupla utilização devolvendo ao
// saldo exatamente o que foi abatido.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";
import {
  novoSaldoAposConcessao,
  novoSaldoAposEstorno,
  novoSaldoAposUso,
  type MovimentacaoCredito,
  type TipoMovimentacaoCredito,
} from "@/lib/financeiro/creditos-utils";

export type { MovimentacaoCredito, TipoMovimentacaoCredito };

export type Credito = {
  clienteId: string;
  saldo: number;
};

export type UsoCreditoContexto = {
  inscricaoId?: string;
  motivo?: string;
};

export type ResultadoUsoCredito = {
  ok: boolean;
  motivo?: string;
  saldoApos?: number;
};

type CreditosContextValue = {
  creditos: Credito[];
  movimentacoes: MovimentacaoCredito[];
  pronto: boolean;
  erro: string | null;
  /** Saldo disponível do cliente (0 quando não há registro). */
  saldoDe: (clienteId: string) => number;
  /** Concede/reforça crédito ao cliente (origem/motivo informado). */
  conceder: (clienteId: string, valor: number, motivo?: string) => void;
  /**
   * Utiliza crédito do cliente, abatendo do saldo. Retorna o novo saldo
   * ou { ok: false } quando o valor excede o saldo disponível.
   */
  utilizar: (
    clienteId: string,
    valor: number,
    ctx?: UsoCreditoContexto
  ) => ResultadoUsoCredito;
  /** Devolve crédito ao saldo (estorno de edição/cancelamento). */
  estornar: (
    clienteId: string,
    valor: number,
    ctx?: UsoCreditoContexto
  ) => void;
  /** Histórico de movimentações de um cliente, do mais recente ao antigo. */
  historicoDe: (clienteId: string) => MovimentacaoCredito[];
};

const CreditosContext = createContext<CreditosContextValue | null>(null);

function gerarId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CreditosProvider({ children }: { children: ReactNode }) {
  const {
    dados: creditos,
    setDados: setCreditos,
    pronto: creditosPronto,
    erro: erroCreditos,
  } = usePersistencia<Credito>("app_creditos", [], {
    idCampo: "clienteId",
    idColuna: "cliente_id",
  });

  const {
    dados: movimentacoes,
    setDados: setMovimentacoes,
    pronto: movPronto,
    erro: erroMov,
  } = usePersistencia<MovimentacaoCredito>("app_credito_movimentacoes", [], {
    ordem: "data",
  });

  const value = useMemo<CreditosContextValue>(
    () => ({
      creditos,
      movimentacoes,
      pronto: creditosPronto && movPronto,
      erro: erroCreditos ?? erroMov,
      saldoDe: (clienteId) =>
        creditos.find((c) => c.clienteId === clienteId)?.saldo ?? 0,
      conceder: (clienteId, valor, motivo) => {
        const saldoAtual = creditos.find((c) => c.clienteId === clienteId)?.saldo ?? 0;
        const saldoNovo = novoSaldoAposConcessao(saldoAtual, valor);
        setCreditos((atual) => {
          const existente = atual.find((c) => c.clienteId === clienteId);
          if (existente) {
            return atual.map((c) =>
              c.clienteId === clienteId ? { ...c, saldo: saldoNovo } : c
            );
          }
          return [...atual, { clienteId, saldo: saldoNovo }];
        });
        adicionarMovimentacao(
          setMovimentacoes,
          {
            clienteId,
            valor,
            tipo: "concedido",
            motivo: motivo ?? "",
            inscricaoId: "",
          },
          saldoNovo
        );
      },
      utilizar: (clienteId, valor, ctx) => {
        if (!clienteId.trim() || valor <= 0) {
          return { ok: false, motivo: "Informe o cliente e o valor do crédito a utilizar." };
        }
        const saldoAtual = creditos.find((c) => c.clienteId === clienteId)?.saldo ?? 0;
        let saldoNovo: number;
        try {
          saldoNovo = novoSaldoAposUso(saldoAtual, valor);
        } catch (e) {
          return {
            ok: false,
            motivo: e instanceof Error ? e.message : "Crédito insuficiente.",
          };
        }
        setCreditos((atual) => {
          const existente = atual.find((c) => c.clienteId === clienteId);
          if (existente) {
            return atual.map((c) =>
              c.clienteId === clienteId ? { ...c, saldo: saldoNovo } : c
            );
          }
          return [...atual, { clienteId, saldo: Math.max(0, saldoNovo) }];
        });
        adicionarMovimentacao(
          setMovimentacoes,
          {
            clienteId,
            valor,
            tipo: "utilizado",
            motivo: ctx?.motivo ?? "",
            inscricaoId: ctx?.inscricaoId ?? "",
          },
          saldoNovo
        );
        return { ok: true, saldoApos: saldoNovo };
      },
      estornar: (clienteId, valor, ctx) => {
        if (!clienteId.trim() || valor <= 0) return;
        const saldoAtual = creditos.find((c) => c.clienteId === clienteId)?.saldo ?? 0;
        const saldoNovo = novoSaldoAposEstorno(saldoAtual, valor);
        setCreditos((atual) => {
          const existente = atual.find((c) => c.clienteId === clienteId);
          if (existente) {
            return atual.map((c) =>
              c.clienteId === clienteId ? { ...c, saldo: saldoNovo } : c
            );
          }
          return [...atual, { clienteId, saldo: saldoNovo }];
        });
        adicionarMovimentacao(
          setMovimentacoes,
          {
            clienteId,
            valor,
            tipo: "estornado",
            motivo: ctx?.motivo ?? "",
            inscricaoId: ctx?.inscricaoId ?? "",
          },
          saldoNovo
        );
      },
      historicoDe: (clienteId) =>
        movimentacoes
          .filter((m) => m.clienteId === clienteId)
          .sort((a, b) =>
            a.data < b.data ? 1 : a.data > b.data ? -1 : a.id < b.id ? 1 : -1
          ),
    }),
    [creditos, movimentacoes, creditosPronto, movPronto, erroCreditos, erroMov]
  );

  return (
    <CreditosContext.Provider value={value}>{children}</CreditosContext.Provider>
  );
}

// Cria a movimentação com o saldo_apos já calculado (snapshot do saldo
// do cliente logo após a operação) e o id único de cada lançamento.
function adicionarMovimentacao(
  setMovimentacoes: (
    updater: (atual: MovimentacaoCredito[]) => MovimentacaoCredito[]
  ) => void,
  dados: {
    clienteId: string;
    valor: number;
    tipo: TipoMovimentacaoCredito;
    motivo: string;
    inscricaoId: string;
  },
  saldoApos: number
) {
  const movimentacao: MovimentacaoCredito = {
    id: gerarId(),
    clienteId: dados.clienteId,
    data: new Date().toISOString().slice(0, 10),
    valor: dados.valor,
    tipo: dados.tipo,
    saldoApos,
    motivo: dados.motivo,
    inscricaoId: dados.inscricaoId,
    referencia: "",
  };
  setMovimentacoes((atual) => [movimentacao, ...atual]);
}

export function useCreditos() {
  const ctx = useContext(CreditosContext);
  if (!ctx) {
    throw new Error("useCreditos precisa ser usado dentro de <CreditosProvider>");
  }
  return ctx;
}