import { describe, expect, it } from "vitest";
import {
  conferirPagamento,
  formaUnicaOuNull,
  legendaItens,
  normalizarItens,
  porForma,
  somarItens,
  totalCreditosItens,
  FORMAS_PAGAMENTO_ORDEM,
  type FormaPagamento,
  type ItemPagamento,
} from "@/lib/financeiro/pagamentos-utils";

const ROTULO: Record<FormaPagamento, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  cortesia: "Cortesia",
  credito: "Crédito pré-existente",
};

describe("somarItens / porForma", () => {
  it("soma os valores de todas as formas", () => {
    const itens: ItemPagamento[] = [
      { forma: "pix", valor: 50 },
      { forma: "dinheiro", valor: 30 },
    ];
    expect(somarItens(itens)).toBe(80);
  });

  it("ignora itens sem valor", () => {
    const itens: ItemPagamento[] = [
      { forma: "pix", valor: 50 },
      { forma: "credito", valor: 0 },
    ];
    expect(somarItens(itens)).toBe(50);
  });

  it("agrupa valores por forma (pagamento dividido)", () => {
    const itens: ItemPagamento[] = [
      { forma: "pix", valor: 50 },
      { forma: "dinheiro", valor: 30 },
      { forma: "cartao", valor: 20 },
      { forma: "credito", valor: 40 },
    ];
    expect(porForma(itens)).toEqual([
      { forma: "pix", valor: 50 },
      { forma: "dinheiro", valor: 30 },
      { forma: "cartao", valor: 20 },
      { forma: "credito", valor: 40 },
    ]);
  });

  it("mantém a ordem estável das formas", () => {
    const itens: ItemPagamento[] = [
      { forma: "credito", valor: 40 },
      { forma: "pix", valor: 60 },
    ];
    expect(porForma(itens).map((f) => f.forma)).toEqual([
      "pix",
      "credito",
    ]);
    expect(porForma(itens).map((f) => f.forma)).toEqual(
      FORMAS_PAGAMENTO_ORDEM.filter((f) => f === "pix" || f === "credito")
    );
  });

  it("soma o total do crédito pré-existente separadamente", () => {
    const itens: ItemPagamento[] = [
      { forma: "credito", valor: 40 },
      { forma: "pix", valor: 60 },
      { forma: "credito", valor: 10 },
    ];
    expect(totalCreditosItens(itens)).toBe(50);
    expect(somarItens(itens)).toBe(110);
  });
});

describe("formaUnicaOuNull", () => {
  it("retorna a forma quando há apenas uma", () => {
    expect(formaUnicaOuNull([{ forma: "pix", valor: 80 }])).toBe("pix");
  });

  it("retorna null em pagamento dividido", () => {
    expect(
      formaUnicaOuNull([
        { forma: "pix", valor: 50 },
        { forma: "dinheiro", valor: 30 },
      ])
    ).toBeNull();
  });

  it("retorna null sem formas", () => {
    expect(formaUnicaOuNull([])).toBeNull();
  });
});

describe("legendaItens", () => {
  it("formata múltiplas formas com valores", () => {
    const itens: ItemPagamento[] = [
      { forma: "pix", valor: 50 },
      { forma: "dinheiro", valor: 30 },
    ];
    expect(legendaItens(itens, ROTULO)).toBe("PIX R$\u00A050,00 · Dinheiro R$\u00A030,00");
  });

  it("inclui o crédito na legenda quando usado", () => {
    const itens: ItemPagamento[] = [
      { forma: "credito", valor: 40 },
      { forma: "pix", valor: 60 },
    ];
    expect(legendaItens(itens, ROTULO)).toBe(
      "PIX R$\u00A060,00 · Crédito pré-existente R$\u00A040,00"
    );
  });
});

describe("conferirPagamento", () => {
  it("confere quando a soma confere com o valor da inscrição", () => {
    const itens: ItemPagamento[] = [
      { forma: "pix", valor: 50 },
      { forma: "dinheiro", valor: 30 },
    ];
    const conferencia = conferirPagamento(itens, 80);
    expect(conferencia.confere).toBe(true);
    expect(conferencia.total).toBe(80);
    expect(conferencia.diferenca).toBe(0);
  });

  it("aponta a diferença quando a soma não confere", () => {
    const itens: ItemPagamento[] = [{ forma: "pix", valor: 50 }];
    const conferencia = conferirPagamento(itens, 80);
    expect(conferencia.confere).toBe(false);
    expect(conferencia.diferenca).toBe(30);
  });

  it("não confere quando não há referência", () => {
    const conferencia = conferirPagamento([{ forma: "pix", valor: 80 }], null);
    expect(conferencia.confere).toBe(true);
    expect(conferencia.referencia).toBeNull();
  });

  it("funciona com crédito + pix", () => {
    const itens: ItemPagamento[] = [
      { forma: "credito", valor: 40 },
      { forma: "pix", valor: 60 },
    ];
    expect(conferirPagamento(itens, 100).confere).toBe(true);
  });
});

describe("normalizarItens", () => {
  it("unifica formas repetidas e remove valores zerados", () => {
    const itens: ItemPagamento[] = [
      { forma: "pix", valor: 25 },
      { forma: "pix", valor: 25 },
      { forma: "dinheiro", valor: 30 },
      { forma: "credito", valor: 0 },
    ];
    expect(normalizarItens(itens)).toEqual([
      { forma: "pix", valor: 50 },
      { forma: "dinheiro", valor: 30 },
    ]);
  });
});