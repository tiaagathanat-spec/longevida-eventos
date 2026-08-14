// Divisão da classificação (e da relação de medalhas) por grupos, a
// partir das cronometragens subidas por prova/evento/categoria.
//
// Dentro de cada prova, o ranking é dividido em grupos definidos por:
// categoria (da prova) · faixa etária (idade do atleta) · sexo. Cada
// grupo tem o seu próprio ranking e as suas próprias medalhas (1º, 2º,
// 3º). A hierarquia completa da divisão é:
// evento → prova → modalidade → categoria → idade → sexo.
//
// A definição oficial de medalhas e ranking só acontece depois que a
// prova é encerrada ("encerrada") e os resultados são publicados — os
// chamadores aplicam essa trava; aqui fica apenas o cálculo por grupo.

import type { Categoria } from "@/lib/mock/categorias-store";
import type { Atleta } from "@/lib/mock/atletas-store";
import { idadeEm, faixaEtariaPara } from "@/lib/mock/faixas-numeracao";
import { classificar, type ItemClassificacao } from "@/lib/mock/classificacao";

export const SEXO_LABEL: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
};

export type GrupoClassificacao = {
  chave: string;
  rotulo: string;
};

export function resolverGrupoClassificacao(
  categoria: Categoria | undefined,
  atleta: Atleta | undefined
): GrupoClassificacao {
  const categoriaNome = categoria?.nome ?? "Sem categoria";
  const sexoLabel = atleta?.genero
    ? SEXO_LABEL[atleta.genero] ?? atleta.genero
    : "Não informado";
  const idade = idadeEm(atleta?.dataNascimento ?? "");
  const faixa = faixaEtariaPara(idade);
  const rotulo = `${categoriaNome} · ${faixa?.rotulo ?? "Idade não informada"} · ${sexoLabel}`;
  return {
    chave: `${categoria?.id ?? ""}|${faixa?.id ?? ""}|${atleta?.genero ?? ""}`,
    rotulo,
  };
}

export type ItemComGrupo<T> = {
  item: T;
  tempo: string;
  categoria: Categoria | undefined;
  atleta: Atleta | undefined;
};

export type GrupoClassificado<T> = {
  chave: string;
  rotulo: string;
  classificacao: ItemClassificacao<T>[];
};

export function classificarPorGrupos<T>(itens: ItemComGrupo<T>[]): GrupoClassificado<T>[] {
  const grupos = new Map<string, { rotulo: string; itens: { item: T; tempo: string }[] }>();
  for (const { item, tempo, categoria, atleta } of itens) {
    const grupo = resolverGrupoClassificacao(categoria, atleta);
    const atual = grupos.get(grupo.chave);
    if (atual) {
      atual.itens.push({ item, tempo });
    } else {
      grupos.set(grupo.chave, { rotulo: grupo.rotulo, itens: [{ item, tempo }] });
    }
  }
  return [...grupos.entries()].map(([chave, grupo]) => ({
    chave,
    rotulo: grupo.rotulo,
    classificacao: classificar(grupo.itens),
  }));
}
