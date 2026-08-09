// Utilitários de cálculo de idade, compartilhados entre as telas do
// Portal do Atleta (cadastro de atletas e inscrição em provas).

/** Idade completa em anos a partir da data de nascimento (ISO yyyy-mm-dd). */
export function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  const nascimento = new Date(dataNascimento + "T00:00:00");
  if (isNaN(nascimento.getTime())) return null;
  const hoje = new Date();
  return idadeEm(dataNascimento, hoje);
}

/** Idade do atleta na data do evento (referência ISO yyyy-mm-dd). */
export function calcularIdadeNaData(
  dataNascimento: string,
  dataReferencia: string
): number | null {
  if (!dataNascimento || !dataReferencia) return null;
  const nascimento = new Date(dataNascimento + "T00:00:00");
  if (isNaN(nascimento.getTime())) return null;
  const referencia = new Date(dataReferencia + "T00:00:00");
  if (isNaN(referencia.getTime())) return null;
  return idadeEm(dataNascimento, referencia);
}

function idadeEm(dataNascimento: string, referencia: Date): number {
  const nascimento = new Date(dataNascimento + "T00:00:00");
  let idade = referencia.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    referencia.getMonth() < nascimento.getMonth() ||
    (referencia.getMonth() === nascimento.getMonth() &&
      referencia.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

/** Menor de idade (menos de 18 anos) na data de referência. */
export function eMenorDeIdade(dataNascimento: string, dataReferencia: string): boolean {
  const idade = calcularIdadeNaData(dataNascimento, dataReferencia);
  return idade !== null && idade < 18;
}

/** Formata a data de nascimento para exibição (dd/mm/aaaa). */
export function formatarData(data: string): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}
