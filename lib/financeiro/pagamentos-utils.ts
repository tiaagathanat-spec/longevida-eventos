// Utilitários puros do módulo Financeiro — pagamentos com UMA OU MAIS
// formas na mesma transação (ex.: R$ 50 PIX + R$ 30 dinheiro) e o
// crédito pré-existente do cliente como forma de pagamento.
//
// Sem React/Next: usado pelas telas (admin/portal) e pelos testes.

export type FormaPagamento =
  | "pix"
  | "dinheiro"
  | "cartao"
  | "cortesia"
  | "credito";

export type ItemPagamento = {
  forma: FormaPagamento;
  valor: number;
};

/** Ordem estável das formas nas listagens/totalizações. */
export const FORMAS_PAGAMENTO_ORDEM: FormaPagamento[] = [
  "pix",
  "dinheiro",
  "cartao",
  "cortesia",
  "credito",
];

export function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Soma dos valores dos itens — o total da transação. */
export function somarItens(itens: ItemPagamento[]): number {
  return arredondar(
    itens.reduce((soma, item) => soma + (Number(item.valor) || 0), 0)
  );
}

/** Total usado de crédito pré-existente nos itens. */
export function totalCreditosItens(itens: ItemPagamento[]): number {
  return somarItens(itens.filter((i) => i.forma === "credito"));
}

/**
 * Agrupa os valores por forma. Retorna um array ordenado
 * (FORMAS_PAGAMENTO_ORDEM) com apenas as formas presentes.
 */
export function porForma(
  itens: ItemPagamento[]
): { forma: FormaPagamento; valor: number }[] {
  const mapa = new Map<FormaPagamento, number>();
  for (const item of itens) {
    const forma = item.forma;
    const valor = Number(item.valor) || 0;
    if (valor <= 0) continue;
    mapa.set(forma, arredondar((mapa.get(forma) ?? 0) + valor));
  }
  return FORMAS_PAGAMENTO_ORDEM.filter((f) => mapa.has(f)).map((f) => ({
    forma: f,
    valor: mapa.get(f)!,
  }));
}

/** Forma única do pagamento, ou null quando dividido/ausente. */
export function formaUnicaOuNull(itens: ItemPagamento[]): FormaPagamento | null {
  const formas = porForma(itens);
  return formas.length === 1 ? formas[0].forma : null;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** "PIX R$ 50,00 · Dinheiro R$ 30,00" — legenda usada na tabela/exportações. */
export function legendaItens(
  itens: ItemPagamento[],
  rotuloForma: Record<FormaPagamento, string>
): string {
  return porForma(itens)
    .map((f) => `${rotuloForma[f.forma]} ${formatarMoeda(f.valor)}`)
    .join(" · ");
}

export type ConferenciaPagamento = {
  /** Total da transação (soma dos itens). */
  total: number;
  /** Total esperado (valor da inscrição/prova), quando informado. */
  referencia: number | null;
  /** true quando a soma dos itens confere com a referência. */
  confere: boolean;
  /** Diferença (referência - total), para o financeiro conferir. */
  diferenca: number;
};

/**
 * Confere a soma dos valores das formas de pagamento com o valor total
 * da inscrição. Quando não há referência, `confere` é true (não há o
 * que conferir).
 */
export function conferirPagamento(
  itens: ItemPagamento[],
  referencia?: number | null
): ConferenciaPagamento {
  const total = somarItens(itens);
  if (referencia == null || Number.isNaN(referencia)) {
    return { total, referencia: null, confere: true, diferenca: 0 };
  }
  const referenciaArredondada = arredondar(referencia);
  return {
    total,
    referencia: referenciaArredondada,
    confere: total === referenciaArredondada,
    diferenca: arredondar(referenciaArredondada - total),
  };
}

/**
 * Remove itens sem valor/forma e unifica formas repetidas somando os
 * valores (ex.: duas linhas "PIX" viram uma). Usado antes de salvar.
 */
export function normalizarItens(
  itens: ItemPagamento[]
): ItemPagamento[] {
  const mapa = new Map<FormaPagamento, number>();
  for (const item of itens) {
    const valor = arredondar(Number(item.valor) || 0);
    if (valor <= 0) continue;
    mapa.set(item.forma, arredondar((mapa.get(item.forma) ?? 0) + valor));
  }
  return FORMAS_PAGAMENTO_ORDEM.filter((f) => mapa.has(f)).map((f) => ({
    forma: f,
    valor: mapa.get(f)!,
  }));
}