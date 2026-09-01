// Utilitários puros do domínio de inscrições (sem JSX, testáveis em vitest).

export type NomeInscricao = {
  atletaNome: string;
  atletaNome2?: string;
  atletaNome3?: string;
  atletaNome4?: string;
};

// Nome exibido de uma inscrição: "X + Y" (e mais integrantes) quando é
// em equipe. Usado nas telas de inscrições, ranking, cronometragem,
// credenciais, QR, financeiro etc.
export function nomeDaInscricao(inscricao: NomeInscricao): string {
  const outros = [inscricao.atletaNome2, inscricao.atletaNome3, inscricao.atletaNome4]
    .map((n) => n?.trim())
    .filter((n): n is string => !!n);
  return outros.length > 0
    ? `${inscricao.atletaNome} + ${outros.join(" + ")}`
    : inscricao.atletaNome;
}
