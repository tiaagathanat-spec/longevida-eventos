// Lógica pura (sem React) do módulo de Faixas de Numeração e faixas
// etárias. Separada da store (faixas-numeracao-store.tsx) para que as
// regras de cálculo possam ser testadas isoladamente e reaproveitadas
// pela classificação (classificacao-grupos.ts).

import type { Categoria } from "@/lib/mock/categorias-store";
import type { Atleta } from "@/lib/mock/atletas-store";

export type CorFaixa =
  | "azul"
  | "verde"
  | "laranja"
  | "roxo"
  | "vermelho"
  | "amarelo"
  | "verde-florescente"
  | "azul-florescente"
  | "verde-bandeira"
  | "azul-marinho"
  | "preto"
  | "rosa"
  | "cinza";

export const COR_FAIXA_HEX: Record<CorFaixa, string> = {
  azul: "#00A6D6",
  verde: "#7CC242",
  laranja: "#F59E0B",
  roxo: "#8B5CF6",
  vermelho: "#EF4444",
  amarelo: "#EAB308",
  "verde-florescente": "#39FF14",
  "azul-florescente": "#00E5FF",
  "verde-bandeira": "#009C3B",
  "azul-marinho": "#1E3A8A",
  preto: "#111111",
  rosa: "#EC4899",
  cinza: "#6B7280",
};

export const COR_FAIXA_LABEL: Record<CorFaixa, string> = {
  azul: "Azul",
  verde: "Verde",
  laranja: "Laranja",
  roxo: "Roxo",
  vermelho: "Vermelho",
  amarelo: "Amarelo",
  "verde-florescente": "Verde florescente",
  "azul-florescente": "Azul florescente",
  "verde-bandeira": "Verde bandeira",
  "azul-marinho": "Azul marinho",
  preto: "Preto",
  rosa: "Rosa",
  cinza: "Cinza",
};

export type CriterioNumeracao = "categoria" | "idade";

export type FaixaEtaria = {
  id: string;
  rotulo: string;
  idadeMinima: number;
  idadeMaxima: number;
};

export const FAIXAS_ETARIAS: FaixaEtaria[] = [
  { id: "0-4", rotulo: "0 a 4 anos", idadeMinima: 0, idadeMaxima: 4 },
  { id: "5-9", rotulo: "5 a 9 anos", idadeMinima: 5, idadeMaxima: 9 },
  { id: "10-12", rotulo: "10 a 12 anos", idadeMinima: 10, idadeMaxima: 12 },
  { id: "13-15", rotulo: "13 a 15 anos", idadeMinima: 13, idadeMaxima: 15 },
  { id: "16-18", rotulo: "16 a 18 anos", idadeMinima: 16, idadeMaxima: 18 },
  { id: "19-29", rotulo: "19 a 29 anos", idadeMinima: 19, idadeMaxima: 29 },
  { id: "30-39", rotulo: "30 a 39 anos", idadeMinima: 30, idadeMaxima: 39 },
  { id: "40-49", rotulo: "40 a 49 anos", idadeMinima: 40, idadeMaxima: 49 },
  { id: "50-59", rotulo: "50 a 59 anos", idadeMinima: 50, idadeMaxima: 59 },
  { id: "60+", rotulo: "60 anos ou mais", idadeMinima: 60, idadeMaxima: 999 },
];

/** Idade (anos completos) a partir da data de nascimento. */
export function idadeEm(dataNascimento: string, referencia = new Date()): number | null {
  if (!dataNascimento) return null;
  const nascimento = new Date(dataNascimento + "T00:00:00");
  if (Number.isNaN(nascimento.getTime())) return null;
  let idade = referencia.getFullYear() - nascimento.getFullYear();
  const mesDiff = referencia.getMonth() - nascimento.getMonth();
  if (mesDiff < 0 || (mesDiff === 0 && referencia.getDate() < nascimento.getDate())) {
    idade -= 1;
  }
  return idade;
}

/** Faixa etária à qual uma idade pertence. */
export function faixaEtariaPara(idade: number | null): FaixaEtaria | undefined {
  if (idade === null || Number.isNaN(idade)) return undefined;
  return FAIXAS_ETARIAS.find((f) => idade >= f.idadeMinima && idade <= f.idadeMaxima);
}

/**
 * Resolve o grupo de numeração de uma inscrição conforme o critério do
 * evento. Por categoria usa a categoria da prova; por idade usa a faixa
 * etária calculada a partir da data de nascimento do atleta (com
 * fallback para a categoria quando não houver atleta/data).
 */
export function resolverGrupoNumeracao(
  criterio: CriterioNumeracao,
  categoria: Categoria | undefined,
  atleta: Atleta | undefined
): { grupoId: string; grupoNome: string } {
  if (criterio === "idade") {
    const idade = idadeEm(atleta?.dataNascimento ?? "");
    const faixa = faixaEtariaPara(idade);
    if (faixa) return { grupoId: faixa.id, grupoNome: faixa.rotulo };
  }
  return { grupoId: categoria?.id ?? "", grupoNome: categoria?.nome ?? "—" };
}

export type FaixaNumeracao = {
  id: string;
  eventoId: string;
  grupoTipo: CriterioNumeracao;
  grupoId: string;
  grupoNome: string;
  numeroInicial: number;
  numeroFinal: number;
  cor: CorFaixa;
};
