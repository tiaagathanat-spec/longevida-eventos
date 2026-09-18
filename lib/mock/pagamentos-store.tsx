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
// status da própria Inscrição (pendente/confirmada/cancelada), para o
// Financeiro funcionar com os dados que já existem no sistema sem exigir
// recadastro manual de tudo.
//
// FORMAS MÚLTIPLAS: cada transação pode ter VÁRIAS formas de pagamento
// com valores individuais (`itens`), ex.: R$ 50 PIX + R$ 30 dinheiro.
// O campo legado `formaPagamento` continua sendo gravado (forma única
// quando houver um só item, senão null) para compatibilidade. O crédito
// pré-existente do cliente ("credito") é uma forma que NÃO entra como
// receita nova — o saldo e o histórico vivem em `creditos-store`.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";
import type { Inscricao } from "@/lib/mock/inscricoes-store";
import {
  formaUnicaOuNull,
  normalizarItens,
  somarItens,
  type FormaPagamento,
  type ItemPagamento,
} from "@/lib/financeiro/pagamentos-utils";

export type { FormaPagamento, ItemPagamento };
export type StatusPagamento = "pago" | "pendente" | "cancelado";

export type Pagamento = {
  inscricaoId: string;
  /** Total da transação (soma dos valores das formas). */
  valor: number;
  /** Formas de pagamento da transação, cada uma com seu valor. */
  itens: ItemPagamento[];
  /** Observação livre do financeiro (ex.: "R$ 50 via Pix + R$ 30 dinheiro"). */
  observacao?: string;
  /** Id do cliente/responsável dono do saldo usado como forma "credito". */
  clienteId?: string;
  /** Legado (forma única quando houver um só item). */
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
  credito: "Crédito pré-existente",
};

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

type PagamentosContextValue = {
  registros: Pagamento[];
  pronto: boolean;
  erro: string | null;
  obterPorInscricao: (inscricaoId: string) => Pagamento | undefined;
  salvar: (
    inscricaoId: string,
    dados: Omit<Pagamento, "inscricaoId" | "valor" | "formaPagamento">
  ) => void;
};

const PagamentosContext = createContext<PagamentosContextValue | null>(null);

export function PagamentosProvider({ children }: { children: ReactNode }) {
  const {
    dados: registros,
    setDados: setRegistros,
    pronto,
    erro,
  } = usePersistencia<Pagamento>(
    "app_pagamentos",
    [],
    { idCampo: "inscricaoId", idColuna: "inscricao_id" }
  );

  const value = useMemo<PagamentosContextValue>(
    () => ({
      registros,
      pronto,
      erro,
      obterPorInscricao: (inscricaoId) =>
        registros.find((p) => p.inscricaoId === inscricaoId),
      // Salva a transação normalizando os itens (formas repetidas somam
      // valores, zeradas saem). O total é sempre a SOMA dos itens — o
      // campo `valor`/`formaPagamento` legados são derivados para não
      // divergirem da estrutura de formas múltiplas.
      salvar: (inscricaoId, dados) => {
        const itens = normalizarItens(dados.itens ?? []);
        const registro: Pagamento = {
          inscricaoId,
          ...dados,
          itens,
          valor: somarItens(itens),
          formaPagamento: formaUnicaOuNull(itens),
        };
        setRegistros((atual) => {
          const existe = atual.some((p) => p.inscricaoId === inscricaoId);
          if (existe) {
            return atual.map((p) =>
              p.inscricaoId === inscricaoId ? registro : p
            );
          }
          return [...atual, registro];
        });
      },
    }),
    [registros, pronto, erro]
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
    itens: [],
    formaPagamento: null,
    status: statusPadrao,
    dataPagamento: statusPadrao === "pago" ? inscricao.dataInscricao : null,
  };
}