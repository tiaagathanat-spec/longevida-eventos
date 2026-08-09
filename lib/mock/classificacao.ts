// Utilitário puro (sem estado) para calcular a classificação automática
// de uma prova a partir dos tempos lançados em resultados-store.
//
// Não é um Context/Provider como os outros módulos — é apenas uma
// função de cálculo, chamada pela tela de Classificação. Quando o
// backend real entrar, essa mesma lógica de ordenação pode virar um
// `ORDER BY` na consulta ou continuar como pós-processamento no server.

/**
 * Converte um tempo no formato "mm:ss.cc", "hh:mm:ss.cc" ou "ss.cc"
 * para o total em segundos (com casas decimais), para permitir a
 * ordenação. Retorna null se o formato não puder ser interpretado.
 */
export function parseTempoParaSegundos(tempo: string): number | null {
  const limpo = tempo.trim();
  if (!limpo) return null;

  const partes = limpo.split(":");
  if (partes.some((p) => p.trim() === "" || isNaN(Number(p)))) return null;

  const numeros = partes.map(Number);

  if (numeros.length === 1) {
    return numeros[0];
  }
  if (numeros.length === 2) {
    const [min, seg] = numeros;
    return min * 60 + seg;
  }
  if (numeros.length === 3) {
    const [h, min, seg] = numeros;
    return h * 3600 + min * 60 + seg;
  }
  return null;
}

export type ItemClassificacao<T> = {
  colocacao: number;
  segundos: number;
  item: T;
};

/**
 * Recebe uma lista de itens com um tempo associado e retorna a mesma
 * lista ordenada do mais rápido para o mais lento, com a colocação
 * (1º, 2º, 3º...) já atribuída. Itens com tempo inválido/vazio são
 * descartados pelo chamador antes de passar aqui.
 */
export function classificar<T>(
  itens: { item: T; tempo: string }[]
): ItemClassificacao<T>[] {
  return itens
    .map(({ item, tempo }) => ({ item, segundos: parseTempoParaSegundos(tempo) }))
    .filter((i): i is { item: T; segundos: number } => i.segundos !== null)
    .sort((a, b) => a.segundos - b.segundos)
    .map((i, index) => ({ colocacao: index + 1, segundos: i.segundos, item: i.item }));
}
