import { describe, it, expect } from "vitest";
import { agruparEmFolhas } from "./agrupar-em-folhas";

describe("agruparEmFolhas", () => {
  it("devolve lista vazia sem itens", () => {
    expect(agruparEmFolhas([])).toEqual([]);
  });

  it("monta 1 folha com até 6 itens", () => {
    expect(agruparEmFolhas([1, 2, 3, 4, 5, 6])).toEqual([[1, 2, 3, 4, 5, 6]]);
    expect(agruparEmFolhas([1])).toEqual([[1]]);
  });

  it("7 itens geram 2 folhas: 6 + 1", () => {
    const folhas = agruparEmFolhas([1, 2, 3, 4, 5, 6, 7]);
    expect(folhas).toHaveLength(2);
    expect(folhas[0]).toHaveLength(6);
    expect(folhas[1]).toEqual([7]);
  });

  it("12 itens geram 2 folhas de 6", () => {
    const folhas = agruparEmFolhas(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(folhas).toHaveLength(2);
    expect(folhas[0]).toHaveLength(6);
    expect(folhas[1]).toHaveLength(6);
  });

  it("13 itens geram 3 folhas (6 + 6 + 1)", () => {
    const folhas = agruparEmFolhas(Array.from({ length: 13 }, (_, i) => i + 1));
    expect(folhas).toHaveLength(3);
    expect(folhas[2]).toEqual([13]);
  });
});