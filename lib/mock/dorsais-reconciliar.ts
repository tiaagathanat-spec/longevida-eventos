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

// Dorsal com o momento em que foi atribuído, usado para decidir quem
// mantém o número quando há duplicata dentro de uma prova.
export type DorsalDaProva = DorsalParaReconciliar & {
  atribuidoEm: string;
};

// Renumeração POR PROVA. O banco exige `UNIQUE(prova_id, numero)`; a
// atribuição automática é por faixa/grupo (que pode coincidir em números
// quando os intervalos das faixas se sobrepõem ou quando grupos
// diferentes disputam a mesma prova). Esta função garante unicidade
// dentro da prova como um todo:
//
//   * números válidos (dentro da faixa do próprio dorsal) e únicos na
//     prova são preservados — na ordem de atribuição (o mais antigo
//     mantém; empates por id);
//   * números duplicados na prova (grupos sobrepostos) ou fora da faixa
//     própria são reatribuídos ao próximo número livre da faixa do
//     dorsal, também respeitando o uso global da prova.
//
// Retorna { dorsalId -> novoNúmero } apenas para os alterados.
// `faixaDoDorsal` informa a faixa de cada dorsal (chave: id do dorsal).
// Números em `numerosNovos` (atribuídos nesta execução) nunca são
// reutilizados.
export function reconciliarNumerosDaProva(
  dorsaisDaProva: DorsalDaProva[],
  faixaDoDorsal: ReadonlyMap<string, FaixaParaReconciliar>,
  numerosNovos: number[] = []
): Map<string, number> {
  const ocupados = new Set<number>(numerosNovos);
  const pendentes: DorsalDaProva[] = [];

  const ordenados = [...dorsaisDaProva].sort(
    (a, b) =>
      a.atribuidoEm.localeCompare(b.atribuidoEm) || a.id.localeCompare(b.id)
  );

  for (const dorsal of ordenados) {
    const faixa = faixaDoDorsal.get(dorsal.id);
    if (
      faixa &&
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
    const faixa = faixaDoDorsal.get(dorsal.id);
    if (!faixa) continue; // sem faixa — não mexe
    let livre = faixa.numeroInicial;
    while (ocupados.has(livre) && livre <= faixa.numeroFinal) livre += 1;
    if (livre > faixa.numeroFinal) continue; // faixa esgotada — mantém atual
    ocupados.add(livre);
    if (dorsal.numero !== livre) resultado.set(dorsal.id, livre);
  }
  return resultado;
}