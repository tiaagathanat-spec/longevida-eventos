import { describe, expect, it } from "vitest";
import {
  faixaEtariaPara,
  idadeEm,
  resolverGrupoNumeracao,
} from "@/lib/mock/faixas-numeracao";
import type { Categoria } from "@/lib/mock/categorias-store";
import type { Atleta } from "@/lib/mock/atletas-store";

const referencia = new Date("2026-08-13T00:00:00");

describe("idadeEm", () => {
  it("calcula anos completos considerando o aniversário", () => {
    expect(idadeEm("2017-08-13", referencia)).toBe(9);
    expect(idadeEm("2017-08-14", referencia)).toBe(8); // faz 9 amanhã
    expect(idadeEm("2017-01-01", referencia)).toBe(9);
  });

  it("retorna null para data vazia ou inválida", () => {
    expect(idadeEm("", referencia)).toBeNull();
    expect(idadeEm("data-invalida", referencia)).toBeNull();
  });
});

describe("faixaEtariaPara", () => {
  it("mapeia idade para a faixa correta", () => {
    expect(faixaEtariaPara(5)?.rotulo).toBe("5 a 9 anos");
    expect(faixaEtariaPara(9)?.rotulo).toBe("5 a 9 anos");
    expect(faixaEtariaPara(13)?.rotulo).toBe("13 a 15 anos");
    expect(faixaEtariaPara(18)?.rotulo).toBe("16 a 18 anos");
    expect(faixaEtariaPara(61)?.rotulo).toBe("60 anos ou mais");
  });

  it("retorna undefined para idade inexistente", () => {
    expect(faixaEtariaPara(null)).toBeUndefined();
    expect(faixaEtariaPara(NaN)).toBeUndefined();
  });
});

describe("resolverGrupoNumeracao", () => {
  const categoria: Categoria = {
    id: "c1",
    nome: "Infantil A",
    idadeMinima: 7,
    idadeMaxima: 9,
    descricao: "",
  };
  function atleta(dataNascimento: string): Atleta {
    return {
      id: "a1",
      nome: "Ana",
      dataNascimento,
      categoriaId: "c1",
      responsavelNome: "",
      email: "",
      telefone: "",
    };
  }

  it("por categoria usa a categoria da prova", () => {
    expect(resolverGrupoNumeracao("categoria", categoria, atleta("2017-01-01"))).toEqual({
      grupoId: "c1",
      grupoNome: "Infantil A",
    });
  });

  it("por idade usa a faixa etária do atleta", () => {
    expect(resolverGrupoNumeracao("idade", categoria, atleta("2017-01-01"))).toEqual({
      grupoId: "5-9",
      grupoNome: "5 a 9 anos",
    });
  });
});
