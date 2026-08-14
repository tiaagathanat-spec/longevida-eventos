import { describe, expect, it } from "vitest";
import { camelParaSnake, limparJson, snakeParaCamel } from "@/lib/supabase/persistencia";

describe("snakeParaCamel", () => {
  it("converte colunas snake_case para camelCase", () => {
    expect(
      snakeParaCamel({
        organizacao_id: "org-1",
        nome_atleta: "Ana",
        check_in_feito: true,
        situacao_alterada_por: "Admin",
        numero_peito: "012",
      })
    ).toEqual({
      organizacaoId: "org-1",
      nomeAtleta: "Ana",
      checkInFeito: true,
      situacaoAlteradaPor: "Admin",
      numeroPeito: "012",
    });
  });

  it("deixa chaves sem underscore intocadas", () => {
    expect(snakeParaCamel({ id: "1", nome: "x" })).toEqual({ id: "1", nome: "x" });
  });
});

describe("camelParaSnake", () => {
  it("converte campos camelCase para snake_case", () => {
    expect(
      camelParaSnake({
        organizacaoId: "org-1",
        nomeAtleta: "Ana",
        checkInFeito: true,
        revisadoPor: "Admin",
        tempoAnterior: "00:32.45",
      })
    ).toEqual({
      organizacao_id: "org-1",
      nome_atleta: "Ana",
      check_in_feito: true,
      revisado_por: "Admin",
      tempo_anterior: "00:32.45",
    });
  });

  it("é a inversa de snakeParaCamel", () => {
    const original = {
      nome_atleta: "Ana",
      data_nascimento: "2017-05-01",
      contato_emergencia_telefone: "99999",
    };
    expect(camelParaSnake(snakeParaCamel(original))).toEqual(original);
  });
});

describe("limparJson", () => {
  it("remove campos undefined (evita null em colunas not null)", () => {
    const limpo = limparJson({
      id: "1",
      tempo: undefined,
      observacao: "ok",
      cronometrista: undefined,
    });
    expect(limpo).toEqual({ id: "1", observacao: "ok" });
    expect(JSON.stringify(limpo)).not.toContain("null");
  });

  it("preserva valores falsy válidos", () => {
    expect(limparJson({ id: "1", checkInFeito: false, valor: 0 })).toEqual({
      id: "1",
      checkInFeito: false,
      valor: 0,
    });
  });
});
