import { describe, expect, it } from "vitest";
import {
  diferencaDeUsoCredito,
  novoSaldoAposConcessao,
  novoSaldoAposEstorno,
  novoSaldoAposUso,
} from "@/lib/financeiro/creditos-utils";

describe("novoSaldoAposUso", () => {
  it("abate o valor utilizado do saldo", () => {
    expect(novoSaldoAposUso(40, 40)).toBe(0);
    expect(novoSaldoAposUso(150, 100)).toBe(50);
    expect(novoSaldoAposUso(75, 50)).toBe(25);
  });

  it("permite usar totalmente o saldo", () => {
    expect(novoSaldoAposUso(150, 150)).toBe(0);
  });

  it("lança erro quando o crédito é insuficiente", () => {
    expect(() => novoSaldoAposUso(40, 50)).toThrow(/insuficiente/);
    expect(() => novoSaldoAposUso(0, 1)).toThrow(/insuficiente/);
  });
});

describe("novoSaldoAposConcessao / Estorno", () => {
  it("concede crédito somando ao saldo", () => {
    expect(novoSaldoAposConcessao(0, 150)).toBe(150);
    expect(novoSaldoAposConcessao(75, 25)).toBe(100);
  });

  it("estorno devolve o valor ao saldo", () => {
    expect(novoSaldoAposEstorno(0, 40)).toBe(40);
    expect(novoSaldoAposEstorno(25, 15)).toBe(40);
  });
});

describe("diferencaDeUsoCredito", () => {
  it("não mexe no saldo quando não usa crédito", () => {
    expect(diferencaDeUsoCredito(0, 0, "pago")).toEqual({
      utilizar: 0,
      estornar: 0,
    });
  });

  it("usa crédito adicional quando a transação aumenta", () => {
    expect(diferencaDeUsoCredito(0, 40, "pago")).toEqual({
      utilizar: 40,
      estornar: 0,
    });
  });

  it("devolve (estorna) quando a transação reduz o crédito", () => {
    expect(diferencaDeUsoCredito(40, 30, "pago")).toEqual({
      utilizar: 0,
      estornar: 10,
    });
  });

  it("devolve TODO o crédito ao cancelar/reverter o pagamento", () => {
    expect(diferencaDeUsoCredito(40, 40, "cancelado")).toEqual({
      utilizar: 0,
      estornar: 40,
    });
    expect(diferencaDeUsoCredito(40, 0, "pendente")).toEqual({
      utilizar: 0,
      estornar: 40,
    });
  });

  it("pagto permanente sem crédito não estorna nada", () => {
    expect(diferencaDeUsoCredito(0, 0, "pendente")).toEqual({
      utilizar: 0,
      estornar: 0,
    });
  });
});