// Lógica pura da renumeração de dorsais quando as faixas mudam.
//
// Quando o administrador altera os intervalos (ou o critério) de
// numeração, os dorsais JÁ atribuídos podem ficar fora da faixa do grupo
// ou duplicados. Esta função recalcula os números de um grupo:
//
//   * números válidos (dentro do intervalo) e únicos são preservados,
//     na ordem do número atual (determinística — empate por id);
//   * números fora do intervalo ou duplicados são reatribuídos ao
//     próximo número livre dentro da faixa, respeitando a ordem atual.
//
// Retorna { dorsalId -> novoNúmero } apenas para os dorsais alterados.
// Números em `numerosNovos` (atribuídos nesta mesma execução pelo
// autoatribuição de novas inscrições) nunca são reutilizados.

export type DorsalParaReconciliar = {
  id: string;
  inscricaoId: string;
  numero: number;
};

export type FaixaParaReconciliar = {
  numeroInicial: number;
  numeroFinal: number;
};

export function reconciliarNumerosDoGrupo(
  faixa: FaixaParaReconciliar,
  dorsaisDoGrupo: DorsalParaReconciliar[],
  numerosNovos: number[] = []
): Map<string, number> {
  const ocupados = new Set<number>(numerosNovos);

  const ordenados = [...dorsaisDoGrupo].sort(
    (a, b) => a.numero - b.numero || a.id.localeCompare(b.id)
  );
  const pendentes: DorsalParaReconciliar[] = [];

  for (const dorsal of ordenados) {
    if (
      dorsal.numero >= faixa.numeroInicial &&
      dorsal.numero <= faixa.numeroFinal &&
      !ocupados.has(dorsal.numero)
    ) {
      ocupados.add(dorsal.numero);
    } else {
      pendentes.push(dorsal);
    }
  }

  const resultado = new Map<string, number>();
  for (const dorsal of pendentes) {
    let livre = faixa.numeroInicial;
    while (ocupados.has(livre) && livre <= faixa.numeroFinal) livre += 1;
    if (livre > faixa.numeroFinal) continue; // faixa esgotada — mantém atual
    ocupados.add(livre);
    if (dorsal.numero !== livre) resultado.set(dorsal.id, livre);
  }
  return resultado;
}