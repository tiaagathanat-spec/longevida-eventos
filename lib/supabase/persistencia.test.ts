import { describe, expect, it } from "vitest";
import {
  agendarEscrita,
  camelParaSnake,
  ehErroDeRede,
  ehErroSemRecursos,
  limparJson,
  snakeParaCamel,
} from "@/lib/supabase/persistencia";

describe("agendarEscrita", () => {
  it("serializa escritas concorrentes (uma por vez, em ordem)", async () => {
    const marca: (number | string)[] = [];
    const tarefa = (nome: string, duracao: number) =>
      agendarEscrita(async () => {
        marca.push(-1);
        await new Promise((resolver) => setTimeout(resolver, duracao));
        marca.push(nome);
        return nome;
      });

    const [a, b, c] = await Promise.all([
      tarefa("A", 12),
      tarefa("B", 4),
      tarefa("C", 8),
    ]);

    expect([a, b, c]).toEqual(["A", "B", "C"]);
    // Nenhuma escrita começa antes de a anterior terminar: os marcadores
    // "início" (-1) nunca aparecem empilhados.
    for (let i = 0; i < marca.length; i += 2) {
      expect(marca[i]).toBe(-1);
      expect(typeof marca[i + 1]).toBe("string");
    }
  });
});

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

  it("converte sufixos ordinais numericos (atleta_nome_2 -> atletaNome2)", () => {
    expect(
      snakeParaCamel({ atleta_nome_2: "Marina", atleta_nome_3: "Caio" })
    ).toEqual({ atletaNome2: "Marina", atletaNome3: "Caio" });
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

  it("é a inversa incluindo sufixos ordinais numericos", () => {
    const original = { atleta_nome_2: "Marina", atleta_nome_3: "Caio" };
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

describe("ehErroDeRede", () => {
  it("detecta exceção TypeError: Failed to fetch", () => {
    expect(ehErroDeRede(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("detecta erro retornado com mensagem de rede", () => {
    expect(ehErroDeRede({ message: "TypeError: Failed to fetch" })).toBe(true);
    expect(ehErroDeRede({ message: "fetch failed" })).toBe(true);
  });

  it("rejeita erros de servidor (Mensagem HTTP normal)", () => {
    expect(
      ehErroDeRede({ code: "42P01", message: "relation does not exist" })
    ).toBe(false);
    expect(
      ehErroDeRede({ code: "42501", message: "permission denied" })
    ).toBe(false);
    expect(
      ehErroDeRede({ code: "401", message: "Invalid JWT" })
    ).toBe(false);
  });

  it("rejeita entrada sem mensagem", () => {
    expect(ehErroDeRede(undefined)).toBe(false);
    expect(ehErroDeRede(null)).toBe(false);
    expect(ehErroDeRede({})).toBe(false);
  });

  it("não trata esgotamento de recursos como rede (evita loop de retry)", () => {
    expect(ehErroDeRede({ message: "net::ERR_INSUFFICIENT_RESOURCES" })).toBe(false);
    expect(ehErroDeRede(new Error("undefined net::ERR_INSUFFICIENT_RESOURCES"))).toBe(false);
  });
});

describe("ehErroSemRecursos", () => {
  it("detecta net::ERR_INSUFFICIENT_RESOURCES", () => {
    expect(ehErroSemRecursos({ message: "net::ERR_INSUFFICIENT_RESOURCES" })).toBe(true);
    expect(ehErroSemRecursos(new Error("undefined net::ERR_INSUFFICIENT_RESOURCES"))).toBe(true);
  });

  it("detecta recusa por excesso de requisições do servidor", () => {
    expect(ehErroSemRecursos({ message: "Too many requests" })).toBe(true);
  });

  it("rejeita falhas de rede comuns", () => {
    expect(ehErroSemRecursos(new TypeError("Failed to fetch"))).toBe(false);
    expect(ehErroSemRecursos({ message: "fetch failed" })).toBe(false);
  });
});
