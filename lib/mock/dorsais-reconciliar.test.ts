import { describe, expect, it } from "vitest";
import {
  reconciliarNumerosDoGrupo,
  reconciliarNumerosDaProva,
  type DorsalDaProva,
  type DorsalParaReconciliar,
  type FaixaParaReconciliar,
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

describe("reconciliarNumerosDaProva", () => {
  function dorsalDaProva(
    id: string,
    numero: number,
    atribuidoEm: string
  ): DorsalDaProva {
    return { id, inscricaoId: `insc-${id}`, numero, atribuidoEm };
  }

  const faixa = (id: string): FaixaParaReconciliar => ({ numeroInicial: 1, numeroFinal: 20 });

  it("mantém números válidos, únicos e dentro da própria faixa", () => {
    const lista = [
      dorsalDaProva("a", 3, "2026-09-01T00:00:00.000Z"),
      dorsalDaProva("b", 7, "2026-09-02T00:00:00.000Z"),
    ];
    const faixas = new Map<string, FaixaParaReconciliar>([
      ["a", faixa("a")],
      ["b", faixa("b")],
    ]);
    expect(reconciliarNumerosDaProva(lista, faixas).size).toBe(0);
  });

  it("renumera duplicata entre grupos sobrepostos, mantendo o mais antigo", () => {
    // Mesmo número (5) na MESMA prova, mas em grupos/faixas diferentes —
    // exatamente o conflito que o banco rejeita (UNIQUE prova_id, numero).
    const lista = [
      dorsalDaProva("antiguo", 5, "2026-09-01T00:00:00.000Z"),
      dorsalDaProva("recente", 5, "2026-09-03T00:00:00.000Z"),
    ];
    const faixas = new Map<string, FaixaParaReconciliar>([
      ["antiguo", faixa("antiguo")],
      ["recente", faixa("recente")],
    ]);
    const mudancas = reconciliarNumerosDaProva(lista, faixas);
    expect(mudancas.size).toBe(1);
    expect(mudancas.has("antiguo")).toBe(false); // o mais antigo mantém o 5
    expect(mudancas.get("recente")).toBe(1); // primeiro livre na prova
  });

  it("renumera número fora da faixa própria dentro da prova", () => {
    const lista = [dorsalDaProva("a", 41, "2026-09-01T00:00:00.000Z")];
    const faixas = new Map<string, FaixaParaReconciliar>([
      ["a", { numeroInicial: 61, numeroFinal: 80 }],
    ]);
    expect(reconciliarNumerosDaProva(lista, faixas).get("a")).toBe(61);
  });

  it("reaproveita números livres após a duplicata", () => {
    const lista = [
      dorsalDaProva("a", 2, "2026-09-01T00:00:00.000Z"),
      dorsalDaProva("b", 2, "2026-09-02T00:00:00.000Z"),
      dorsalDaProva("c", 3, "2026-09-03T00:00:00.000Z"),
    ];
    const faixaMap = new Map<string, FaixaParaReconciliar>([
      ["a", faixa("a")],
      ["b", faixa("b")],
      ["c", faixa("c")],
    ]);
    const mudancas = reconciliarNumerosDaProva(lista, faixaMap);
    expect(mudancas.get("b")).toBe(1); // 1 é o primeiro livre (2 e 3 ocupados)
  });

  it("não reutiliza números atribuídos nesta execução", () => {
    const lista = [dorsalDaProva("a", 5, "2026-09-01T00:00:00.000Z")];
    const faixas = new Map<string, FaixaParaReconciliar>([
      ["a", faixa("a")],
    ]);
    const mudancas = reconciliarNumerosDaProva(lista, faixas, [5]);
    expect(mudancas.has("a")).toBe(true);
    expect(mudancas.get("a")).toBe(1);
  });

  it("não mexe em dorsal sem faixa", () => {
    const lista = [dorsalDaProva("a", 5, "2026-09-01T00:00:00.000Z")];
    expect(reconciliarNumerosDaProva(lista, new Map()).size).toBe(0);
  });

  it("não reatribui quando a faixa está esgotada", () => {
    const lista = [
      dorsalDaProva("a", 1, "2026-09-01T00:00:00.000Z"),
      dorsalDaProva("b", 1, "2026-09-02T00:00:00.000Z"),
    ];
    const faixas = new Map<string, FaixaParaReconciliar>([
      ["a", { numeroInicial: 1, numeroFinal: 1 }],
      ["b", { numeroInicial: 1, numeroFinal: 1 }],
    ]);
    const mudancas = reconciliarNumerosDaProva(lista, faixas);
    expect(mudancas.size).toBe(0); // sem espaço para "b" — mantém como está
  });
});