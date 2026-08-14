import { describe, expect, it } from "vitest";
import { parseTempoParaSegundos, classificar } from "@/lib/mock/classificacao";
import {
  classificarPorGrupos,
  resolverGrupoClassificacao,
} from "@/lib/mock/classificacao-grupos";
import type { Categoria } from "@/lib/mock/categorias-store";
import type { Atleta } from "@/lib/mock/atletas-store";

describe("parseTempoParaSegundos", () => {
  it("interpreta o formato mm:ss.cc", () => {
    expect(parseTempoParaSegundos("00:32.45")).toBe(32.45);
    expect(parseTempoParaSegundos("01:05.00")).toBe(65);
  });

  it("interpreta hh:mm:ss.cc", () => {
    expect(parseTempoParaSegundos("01:02:03")).toBe(3723);
  });

  it("interpreta apenas segundos", () => {
    expect(parseTempoParaSegundos("12.5")).toBe(12.5);
  });

  it("retorna null para formatos inválidos ou vazios", () => {
    expect(parseTempoParaSegundos("")).toBeNull();
    expect(parseTempoParaSegundos("   ")).toBeNull();
    expect(parseTempoParaSegundos("ab:cd")).toBeNull();
    expect(parseTempoParaSegundos("1:2:3:4")).toBeNull();
    expect(parseTempoParaSegundos("10:")).toBeNull();
  });
});

describe("classificar", () => {
  it("ordena do mais rápido para o mais lento e atribui colocação", () => {
    const resultado = classificar([
      { item: "a", tempo: "00:40.00" },
      { item: "b", tempo: "00:32.45" },
      { item: "c", tempo: "00:50.10" },
    ]);
    expect(resultado.map((r) => r.item)).toEqual(["b", "a", "c"]);
    expect(resultado.map((r) => r.colocacao)).toEqual([1, 2, 3]);
  });

  it("descarta tempos inválidos", () => {
    const resultado = classificar([
      { item: "a", tempo: "00:40.00" },
      { item: "b", tempo: "" },
      { item: "c", tempo: "inválido" },
    ]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].item).toBe("a");
  });
});

const categoriaInfantil: Categoria = {
  id: "cat-1",
  nome: "Infantil A",
  idadeMinima: 7,
  idadeMaxima: 9,
  descricao: "",
};

const categoriaJuvenil: Categoria = {
  id: "cat-2",
  nome: "Juvenil",
  idadeMinima: 13,
  idadeMaxima: 15,
  descricao: "",
};

function atleta(nome: string, dataNascimento: string, genero: string): Atleta {
  return {
    id: nome,
    nome,
    dataNascimento,
    categoriaId: "cat-1",
    responsavelNome: "",
    email: "",
    telefone: "",
    genero: (genero || undefined) as Atleta["genero"],
  };
}

describe("resolverGrupoClassificacao", () => {
  it("usa categoria, faixa etária e sexo no rótulo", () => {
    const grupo = resolverGrupoClassificacao(
      categoriaInfantil,
      atleta("Ana", "2017-05-01", "feminino")
    );
    expect(grupo.rotulo).toBe("Infantil A · 5 a 9 anos · Feminino");
    expect(grupo.chave).toContain("cat-1");
  });

  it("trata atleta sem sexo como Não informado", () => {
    const grupo = resolverGrupoClassificacao(
      categoriaJuvenil,
      atleta("Bruno", "2012-05-01", "")
    );
    expect(grupo.rotulo).toContain("Não informado");
  });

  it("trata ausência de categoria", () => {
    const grupo = resolverGrupoClassificacao(
      undefined,
      atleta("Carla", "1990-05-01", "feminino")
    );
    expect(grupo.rotulo).toContain("Sem categoria");
  });
});

describe("classificarPorGrupos", () => {
  it("separa atletas em grupos e classifica dentro de cada um", () => {
    const itens = [
      {
        item: { id: "1" },
        tempo: "00:40.00",
        categoria: categoriaInfantil,
        atleta: atleta("Ana", "2017-05-01", "feminino"),
      },
      {
        item: { id: "2" },
        tempo: "00:32.45",
        categoria: categoriaInfantil,
        atleta: atleta("Bia", "2017-06-01", "feminino"),
      },
      {
        item: { id: "3" },
        tempo: "00:30.00",
        categoria: categoriaJuvenil,
        atleta: atleta("Cadu", "2012-05-01", "masculino"),
      },
    ];

    const grupos = classificarPorGrupos(itens);

    expect(grupos).toHaveLength(2);
    const infantil = grupos.find((g) => g.rotulo.includes("Infantil A"));
    const juvenil = grupos.find((g) => g.rotulo.includes("Juvenil"));
    expect(infantil?.classificacao.map((c) => c.item.id)).toEqual(["2", "1"]);
    expect(infantil?.classificacao[0].colocacao).toBe(1);
    expect(juvenil?.classificacao[0].item.id).toBe("3");
    expect(juvenil?.classificacao[0].colocacao).toBe(1);
  });

  it("mantém o 1º lugar em cada grupo independente do tempo global", () => {
    const itens = [
      {
        item: { id: "lento" },
        tempo: "02:00.00",
        categoria: categoriaInfantil,
        atleta: atleta("Ana", "2017-05-01", "feminino"),
      },
      {
        item: { id: "rapido" },
        tempo: "00:20.00",
        categoria: categoriaJuvenil,
        atleta: atleta("Cadu", "2012-05-01", "masculino"),
      },
    ];
    const grupos = classificarPorGrupos(itens);
    const infantil = grupos.find((g) => g.rotulo.includes("Infantil A"));
    expect(infantil?.classificacao[0].item.id).toBe("lento");
    expect(infantil?.classificacao[0].colocacao).toBe(1);
  });
});
