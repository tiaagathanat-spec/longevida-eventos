import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enfileirarFila,
  lerFilaOffline,
  limparFila,
  removerDaFila,
  totalPendentesFila,
} from "@/lib/supabase/fila-offline";

// Testes da fila offline isolada — foca no comportamento da DEDUPLICAÇÃO:
// o retry de rede re-enfileiraria as mesmas linhas a cada tentativa; sem
// dedupe a fila viraria um depósito e o processamento sobrecarregaria o
// navegador (para de responder, ERR_INSUFFICIENT_RESOURCES).

let dados: Map<string, string>;

beforeEach(() => {
  dados = new Map();
  const windowFalso = {
    localStorage: {
      getItem: (chave: string) => dados.get(chave) ?? null,
      setItem: (chave: string, valor: string) => void dados.set(chave, valor),
      removeItem: (chave: string) => void dados.delete(chave),
    },
    dispatchEvent: vi.fn(),
  };
  Object.defineProperty(globalThis, "window", {
    value: windowFalso,
    configurable: true,
    writable: true,
  });
  limparFila();
  vi.clearAllMocks();
});

describe("enfileirarFila", () => {
  it("adiciona uma linha pendente", () => {
    enfileirarFila("app_inscricoes", { id: "1", nome_atleta: "Ana" });
    expect(totalPendentesFila()).toBe(1);
    expect(lerFilaOffline()[0].tabela).toBe("app_inscricoes");
  });

  it("não duplica a mesma linha na mesma tabela (retry de rede)", () => {
    enfileirarFila("app_inscricoes", { id: "1", nome_atleta: "Ana" });
    enfileirarFila("app_inscricoes", { id: "1", nome_atleta: "Ana" });
    enfileirarFila("app_inscricoes", { id: "1", nome_atleta: "Ana" });
    expect(totalPendentesFila()).toBe(1);
  });

  it("atualiza o payload da linha repetida em vez de empilhar", () => {
    enfileirarFila("app_inscricoes", { id: "1", nome_atleta: "Ana" });
    enfileirarFila("app_inscricoes", { id: "1", nome_atleta: "Ana M." });
    const unica = lerFilaOffline()[0];
    expect(totalPendentesFila()).toBe(1);
    expect(unica.linha.nome_atleta).toBe("Ana M.");
  });

  it("mantém linhas diferentes (noutra tabela ou outro id)", () => {
    enfileirarFila("app_inscricoes", { id: "1", nome_atleta: "Ana" });
    enfileirarFila("app_inscricoes", { id: "2", nome_atleta: "Bia" });
    enfileirarFila("app_pagamentos", { id: "3", valor: 50 });
    expect(totalPendentesFila()).toBe(3);
  });

  it("removerDaFila/limparFila continuam funcionando", () => {
    enfileirarFila("app_inscricoes", { id: "1", nome_atleta: "Ana" });
    removerDaFila("app_inscricoes", "1");
    expect(totalPendentesFila()).toBe(0);
    enfileirarFila("app_inscricoes", { id: "1" });
    limparFila();
    expect(totalPendentesFila()).toBe(0);
  });
});