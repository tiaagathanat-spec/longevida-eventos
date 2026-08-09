"use client";

// Store temporário do módulo Financeiro, em memória (Context + useState).
// Mesmo padrão dos demais módulos: substituir por Server Actions + Prisma
// quando o backend real entrar.
//
// Corresponde à tabela `pagamentos` já prevista na modelagem da Etapa 2
// (ligada 1:1 à Inscrição aqui, por simplicidade — a tabela de junção
// `itens_pagamento`, para um pagamento cobrir várias inscrições de uma
// vez, fica para quando o fluxo de pagamento em lote for desenvolvido).
//
// Nem toda Inscrição tem um registro explícito aqui ainda — enquanto não
// tiver, `pagamentoEfetivo()` calcula um valor "padrão" a partir do
// status da própria Inscrição, para o Financeiro funcionar com os dados
// que já existem no sistema sem exigir recadastro manual de tudo.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";
import type { Inscricao } from "@/lib/mock/inscricoes-store";

export type FormaPagamento = "pix" | "dinheiro" | "cartao" | "cortesia";
export type StatusPagamento = "pago" | "pendente" | "cancelado";

export type Pagamento = {
  inscricaoId: string;
  valor: number;
  formaPagamento: FormaPagamento | null;
  status: StatusPagamento;
  dataPagamento: string | null; // ISO date, null se ainda não pago
  comprovanteUrl?: string; // data URL do anexo enviado pelo atleta (PIX)
};

export const VALOR_PADRAO_INSCRICAO = 60;

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  cortesia: "Cortesia",
};

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

type PagamentosContextValue = {
  registros: Pagamento[];
  obterPorInscricao: (inscricaoId: string) => Pagamento | undefined;
  salvar: (inscricaoId: string, dados: Omit<Pagamento, "inscricaoId">) => void;
};

const PagamentosContext = createContext<PagamentosContextValue | null>(null);

export function PagamentosProvider({ children }: { children: ReactNode }) {
  const { dados: registros, setDados: setRegistros } = usePersistencia<Pagamento>(
    "app_pagamentos",
    [],
    { idCampo: "inscricaoId", idColuna: "inscricao_id" }
  );

  const value = useMemo<PagamentosContextValue>(
    () => ({
      registros,
      obterPorInscricao: (inscricaoId) =>
        registros.find((p) => p.inscricaoId === inscricaoId),
      salvar: (inscricaoId, dados) => {
        setRegistros((atual) => {
          const existe = atual.some((p) => p.inscricaoId === inscricaoId);
          if (existe) {
            return atual.map((p) =>
              p.inscricaoId === inscricaoId ? { inscricaoId, ...dados } : p
            );
          }
          return [...atual, { inscricaoId, ...dados }];
        });
      },
    }),
    [registros]
  );

  return (
    <PagamentosContext.Provider value={value}>{children}</PagamentosContext.Provider>
  );
}

export function usePagamentos() {
  const ctx = useContext(PagamentosContext);
  if (!ctx) {
    throw new Error("usePagamentos precisa ser usado dentro de <PagamentosProvider>");
  }
  return ctx;
}

/**
 * Calcula o pagamento "efetivo" de uma inscrição: usa o registro
 * explícito em pagamentos-store se existir, senão deriva um padrão a
 * partir do status da própria Inscrição (pendente/confirmada/cancelada),
 * para que inscrições antigas (de antes do módulo Financeiro existir)
 * já apareçam corretamente na tela. O valor usa o registrado na Prova
 * (quando informado), caindo para VALOR_PADRAO_INSCRICAO como fallback.
 */
export function pagamentoEfetivo(
  inscricao: Inscricao,
  registro: Pagamento | undefined,
  valorDaProva?: number
): Pagamento {
  if (registro) return registro;

  const statusPadrao: StatusPagamento =
    inscricao.status === "confirmada"
      ? "pago"
      : inscricao.status === "cancelada"
      ? "cancelado"
      : "pendente";

  return {
    inscricaoId: inscricao.id,
    valor: valorDaProva ?? VALOR_PADRAO_INSCRICAO,
    formaPagamento: null,
    status: statusPadrao,
    dataPagamento: statusPadrao === "pago" ? inscricao.dataInscricao : null,
  };
}
