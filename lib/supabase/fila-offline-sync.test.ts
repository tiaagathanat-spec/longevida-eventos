import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocka a camada que toca rede (Supabase) e o módulo da fila offline para
// testar a rotina `processarFilaOffline` isoladamente — em especial a
// guarda de reentrância que evita reconciliar a fila em paralelo.

const mocks = vi.hoisted(() => {
  const upsert = vi.fn();
  const from = vi.fn();
  const getSession = vi.fn();
  return {
    upsert,
    from,
    getSession,
    supabase: { from, auth: { getSession } },
    fila: {
      obterPendentesFila: vi.fn(),
      removerDaFila: vi.fn(),
      notificarMudancaFila: vi.fn(),
      totalPendentesFila: vi.fn(),
      enfileirarFila: vi.fn(),
    },
  };
});

vi.mock("@/lib/supabase/fila-offline", () => ({
  enfileirarFila: mocks.fila.enfileirarFila,
  notificarMudancaFila: mocks.fila.notificarMudancaFila,
  obterPendentesFila: mocks.fila.obterPendentesFila,
  removerDaFila: mocks.fila.removerDaFila,
  totalPendentesFila: mocks.fila.totalPendentesFila,
  usePendentesOffline: () => 0,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mocks.supabase,
}));

import {
  processarFilaOffline,
  tentarReconciliarAgora,
} from "@/lib/supabase/persistencia";

function itemPendente(id = "1") {
  return {
    tabela: "app_inscricoes",
    linha: { id, nome_atleta: "Ana" },
    enfileiradoEm: new Date().toISOString(),
  };
}

beforeEach(() => {
  mocks.upsert.mockReset();
  mocks.from.mockReset();
  mocks.getSession.mockReset();
  mocks.fila.obterPendentesFila.mockReset();
  mocks.fila.removerDaFila.mockReset();
  mocks.fila.notificarMudancaFila.mockReset();
  mocks.fila.totalPendentesFila.mockReset();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.from.mockReturnValue({ upsert: mocks.upsert });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("processarFilaOffline", () => {
  it("não faz nada quando não há itens pendentes", async () => {
    mocks.fila.obterPendentesFila.mockReturnValue([]);
    await processarFilaOffline();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("rejeição em duas chamadas concorrentes: só a primeira processa", async () => {
    mocks.fila.obterPendentesFila.mockReturnValue([itemPendente()]);
    let resolveUpsert: (v: { error: null }) => void = () => {};
    mocks.upsert.mockImplementation(
      () => new Promise((resolve) => (resolveUpsert = resolve))
    );

    const primeira = processarFilaOffline();
    const segunda = processarFilaOffline();
    await segunda;
    expect(mocks.upsert).toHaveBeenCalledTimes(1);

    resolveUpsert({ error: null });
    await primeira;
    expect(mocks.fila.removerDaFila).toHaveBeenCalledWith(
      "app_inscricoes",
      "1"
    );
  });

  it("remove o item quando o upsert dá sucesso", async () => {
    mocks.fila.obterPendentesFila.mockReturnValue([itemPendente()]);
    mocks.upsert.mockResolvedValue({ error: null });

    await processarFilaOffline();

    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.fila.removerDaFila).toHaveBeenCalledWith(
      "app_inscricoes",
      "1"
    );
    expect(mocks.fila.notificarMudancaFila).toHaveBeenCalled();
  });

  it("remove quando a tabela não existe (42P01)", async () => {
    mocks.fila.obterPendentesFila.mockReturnValue([itemPendente()]);
    mocks.upsert.mockResolvedValue({
      error: { code: "42P01", message: "relation does not exist" },
    });

    await processarFilaOffline();

    expect(mocks.fila.removerDaFila).toHaveBeenCalledWith(
      "app_inscricoes",
      "1"
    );
  });

  it("remove em erro permanente de permissão (RLS)", async () => {
    mocks.fila.obterPendentesFila.mockReturnValue([itemPendente()]);
    mocks.upsert.mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });

    await processarFilaOffline();

    // Re-tentar RLS para sempre é inútil: o item é removido da fila.
    expect(mocks.fila.removerDaFila).toHaveBeenCalledWith(
      "app_inscricoes",
      "1"
    );
  });

  it("remove em erro permanente de chave duplicada", async () => {
    mocks.fila.obterPendentesFila.mockReturnValue([itemPendente()]);
    mocks.upsert.mockResolvedValue({
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "unique"',
      },
    });

    await processarFilaOffline();

    expect(mocks.fila.removerDaFila).toHaveBeenCalledWith(
      "app_inscricoes",
      "1"
    );
  });

  it("mantém o item na fila quando o upsert lança (rede fora)", async () => {
    mocks.fila.obterPendentesFila.mockReturnValue([itemPendente()]);
    mocks.upsert.mockRejectedValue(new TypeError("Failed to fetch"));

    await processarFilaOffline();

    expect(mocks.fila.removerDaFila).not.toHaveBeenCalled();
  });

  it("mantém o item na fila em erro de rede retornado como objeto", async () => {
    mocks.fila.obterPendentesFila.mockReturnValue([itemPendente()]);
    mocks.upsert.mockResolvedValue({
      error: { message: "TypeError: Failed to fetch" },
    });

    await processarFilaOffline();

    expect(mocks.fila.removerDaFila).not.toHaveBeenCalled();
  });

  it("mantém o item na fila em escassez de recursos (não descarta dado)", async () => {
    mocks.fila.obterPendentesFila.mockReturnValue([itemPendente()]);
    mocks.upsert.mockResolvedValue({
      error: { message: "net::ERR_INSUFFICIENT_RESOURCES" },
    });

    await processarFilaOffline();

    expect(mocks.fila.removerDaFila).not.toHaveBeenCalled();
  });
});

describe("tentarReconciliarAgora", () => {
  it("delega ao processamento da fila", async () => {
    mocks.fila.obterPendentesFila.mockReturnValue([itemPendente()]);
    mocks.upsert.mockResolvedValue({ error: null });

    await tentarReconciliarAgora();

    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.fila.removerDaFila).toHaveBeenCalled();
  });
});