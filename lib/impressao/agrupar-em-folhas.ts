// Divide os itens selecionados em folhas de impressão com até N por folha
// (padrão: 6 cards de 8,5x5,5 cm por página A4). Ex.: 7 itens -> [6, 1];
// 12 -> [6, 6].
export function agruparEmFolhas<T>(itens: T[], porFolha = 6): T[][] {
  const folhas: T[][] = [];
  for (let i = 0; i < itens.length; i += porFolha) {
    folhas.push(itens.slice(i, i + porFolha));
  }
  return folhas;
}