import { beforeEach, describe, expect, it } from "vitest";
import {
  enfileirarFila,
  lerFilaOffline,
  limparFila,
  obterPendentesFila,
  removerDaFila,
  totalPendentesFila,
} from "@/lib/supabase/fila-offline";

// Stub de localStorage para simular o navegador em ambiente node.
function criarMemoria() {
  const mapa = new Map<string, string>();
  return {
    getItem: (k: string) => mapa.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mapa.set(k, v);
    },
    removeItem: (k: string) => {
      mapa.delete(k);
    },
    clear: () => mapa.clear(),
  };
}

type Storage = ReturnType<typeof criarMemoria>;
let memoria: Storage;

beforeEach(() => {
  memoria = criarMemoria();
  (globalThis as Record<string, unknown>).window = {
    localStorage: memoria,
    dispatchEvent: () => true,
  };
});

describe("fila offline", () => {
  it("começa vazia", () => {
    expect(totalPendentesFila()).toBe(0);
    expect(lerFilaOffline()).toEqual([]);
  });

  it("enfileira itens com tabela e data", () => {
    enfileirarFila("app_resultados", { id: "r1", tempo: "00:32.45" });
    enfileirarFila("app_resultados", { id: "r2", tempo: "00:33.10" });

    expect(totalPendentesFila()).toBe(2);
    expect(totalPendentesFila("app_resultados")).toBe(2);
    expect(totalPendentesFila("app_outra_tabela")).toBe(0);
    const pendentes = obterPendentesFila("app_resultados");
    expect(pendentes[0].tabela).toBe("app_resultados");
    expect(pendentes[0].linha.id).toBe("r1");
    expect(pendentes[0].enfileiradoEm).toBeTruthy();
  });

  it("sobrevive a um 'recarregamento' (persistência em localStorage)", () => {
    enfileirarFila("app_resultados", { id: "r1", tempo: "00:32.45" });
    expect(lerFilaOffline()).toHaveLength(1);
    // Simula novo load da página lendo do mesmo armazenamento.
    (globalThis as Record<string, unknown>).window = {
      localStorage: memoria,
      dispatchEvent: () => true,
    };
    expect(obterPendentesFila("app_resultados")).toHaveLength(1);
  });

  it("remove um item específico por tabela+id", () => {
    enfileirarFila("app_resultados", { id: "r1", tempo: "a" });
    enfileirarFila("app_resultados", { id: "r2", tempo: "b" });
    removerDaFila("app_resultados", "r1");
    const restantes = obterPendentesFila("app_resultados");
    expect(restantes).toHaveLength(1);
    expect(restantes[0].linha.id).toBe("r2");
  });

  it("limpa a fila por completo", () => {
    enfileirarFila("app_resultados", { id: "r1" });
    enfileirarFila("app_inscricoes", { id: "i1" });
    limparFila();
    expect(totalPendentesFila()).toBe(0);
  });

  it("lida com JSON corrompido retornando fila vazia", () => {
    memoria.setItem("longevida_offline_fila", "{{{not-json");
    expect(lerFilaOffline()).toEqual([]);
    expect(totalPendentesFila()).toBe(0);
  });
});
