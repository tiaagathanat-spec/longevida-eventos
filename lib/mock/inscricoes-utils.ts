// Utilitários puros do domínio de inscrições (sem JSX, testáveis em vitest).

export type NomeInscricao = {
  atletaNome: string;
  atletaNome2?: string;
};

// Nome exibido de uma inscrição: "X + Y" quando é dupla. Usado nas telas
// de inscrições, ranking, cronometragem, credenciais e QR.
export function nomeDaInscricao(inscricao: NomeInscricao): string {
  const segundo = inscricao.atletaNome2?.trim();
  return segundo ? `${inscricao.atletaNome} + ${segundo}` : inscricao.atletaNome;
}
