import { describe, expect, it } from "vitest";
import {
  reconciliarNumerosDoGrupo,
  type DorsalParaReconciliar,
} from "@/lib/mock/dorsais-reconciliar";

function dorsal(id: string, numero: number): DorsalParaReconciliar {
  return { id, inscricaoId: `insc-${id}`, numero };
}

describe("reconciliarNumerosDoGrupo", () => {
  it("mantém números válidos e únicos dentro da faixa", () => {
    const mudancas = reconciliarNumerosDoGrupo(
      { numeroInicial: 141, numeroFinal: 160 },
      [dorsal("a", 142), dorsal("b", 141), dorsal("c", 150)]
    );
    expect(mudancas.size).toBe(0);
  });

  it("renumera para o início da faixa quando o número está abaixo", () => {
    const mudancas = reconciliarNumerosDoGrupo(
      { numeroInicial: 61, numeroFinal: 80 },
      [dorsal("a", 41)]
    );
    expect(mudancas.get("a")).toBe(61);
  });

  it("renumera para o início da faixa quando o número está acima", () => {
    const mudancas = reconciliarNumerosDoGrupo(
      { numeroInicial: 1, numeroFinal: 20 },
      [dorsal("a", 99)]
    );
    expect(mudancas.get("a")).toBe(1);
  });

  it("empurra um grupo inteiro para dentro da nova faixa, na ordem atual", () => {
    const dorsais = [dorsal("b", 82), dorsal("a", 81), dorsal("c", 89)];
    const mudancas = reconciliarNumerosDoGrupo(
      { numeroInicial: 141, numeroFinal: 160 },
      dorsais
    );
    // ordem determinística pelo número atual (81, 82, 89)
    expect([...mudancas.entries()]).toEqual([
      ["a", 141],
      ["b", 142],
      ["c", 143],
    ]);
  });

  it("conflito duplicado dentro da faixa é resolvido", () => {
    const mudancas = reconciliarNumerosDoGrupo(
      { numeroInicial: 1, numeroFinal: 20 },
      [dorsal("a", 5), dorsal("b", 5)]
    );
    expect(mudancas.size).toBe(1);
    // o primeiro (ordem por id) mantém o 5; o segundo vai para o primeiro livre
    expect(mudancas.has("b") || mudancas.has("a")).toBe(true);
    expect([...mudancas.values()][0]).not.toBe(5);
  });

  it("nunca reutiliza números já atribuídos nesta execução", () => {
    const mudancas = reconciliarNumerosDoGrupo(
      { numeroInicial: 1, numeroFinal: 20 },
      [dorsal("b", 5)],
      [5] // 5 acabou de ser dado a uma inscrição nova
    );
    expect(mudancas.has("b")).toBe(true); // não pode manter o 5
    expect(mudancas.get("b")).toBe(1); // 1 está livre após os ocupados {5}
  });

  it("não reatribui quando a faixa está esgotada", () => {
    const mudancas = reconciliarNumerosDoGrupo(
      { numeroInicial: 1, numeroFinal: 1 },
      [dorsal("a", 1), dorsal("b", 7)]
    );
    expect(mudancas.has("a")).toBe(false); // o 1 já está ocupado por "a"
    expect(mudancas.has("b")).toBe(false); // sem espaço — mantém o atual
  });
});