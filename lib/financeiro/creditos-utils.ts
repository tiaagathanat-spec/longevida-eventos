// Utilitários puros do crédito pré-existente do cliente.
//
// O saldo é sempre numérico e nunca pode ficar negativo. A utilização
// de crédito é abatida do saldo; o estorno (edição/cancelamento de um
// pagamento que usou crédito) devolve o valor ao saldo. Cada operação
// gera uma movimentação com `saldo_apos` (histórico no Supabase).

export type TipoMovimentacaoCredito =
  | "concedido"
  | "utilizado"
  | "estornado";

export type MovimentacaoCredito = {
  id: string;
  clienteId: string;
  data: string;
  valor: number;
  tipo: TipoMovimentacaoCredito;
  saldoApos: number;
  motivo: string;
  inscricaoId: string;
  referencia: string;
};

import { arredondar } from "./pagamentos-utils";

/** Lança erro quando a utilização deixaria o saldo negativo. */
export function novoSaldoAposUso(saldo: number, valor: number): number {
  const saldoArredondado = arredondar(saldo);
  const valorArredondado = arredondar(valor);
  const resultado = arredondar(saldoArredondado - valorArredondado);
  if (resultado < 0) {
    throw new Error(
      `Crédito insuficiente: saldo de ${saldoArredondado.toLocaleString(
        "pt-BR",
        { style: "currency", currency: "BRL" }
      )} não cobre a utilização de ${valorArredondado.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}.`
    );
  }
  return resultado;
}

/** Créditos concedidos ao cliente (reforço de saldo). */
export function novoSaldoAposConcessao(saldo: number, valor: number): number {
  return arredondar(arredondar(saldo) + arredondar(valor));
}

/** Estorno de uso: devolve o valor ao saldo do cliente. */
export function novoSaldoAposEstorno(saldo: number, valor: number): number {
  return arredondar(arredondar(saldo) + arredondar(valor));
}

export type DiferencaCredito = {
  /** Quanto de crédito ADICIONAL passar a ser usado na transação. */
  utilizar: number;
  /** Quanto de crédito passar a ser devolvido ao saldo. */
  estornar: number;
};

/**
 * Calcula a diferença de crédito entre o pagamento antigo e o novo.
 *
 * - Pagamento que deixa de ser "pago" (pendente/cancelado): NENHUM
 *   crédito é consumido — todo o crédito usado antes é devolvido
 *   (`estornar = creditoAntigo`).
 * - Pagamento pago: compara o crédito usado antes e depois. Aumentar
 *   o crédito na transação consome mais do saldo (`utilizar`);
 *   diminuir devolve (`estornar`).
 */
export function diferencaDeUsoCredito(
  creditoAntigo: number,
  creditoNovo: number,
  novoStatus: string
): DiferencaCredito {
  const antigo = arredondar(creditoAntigo);
  if (novoStatus !== "pago") {
    return { utilizar: 0, estornar: antigo };
  }
  const novo = arredondar(creditoNovo);
  const delta = arredondar(novo - antigo);
  if (delta >= 0) {
    return { utilizar: arredondar(delta), estornar: 0 };
  }
  return { utilizar: 0, estornar: arredondar(-delta) };
}