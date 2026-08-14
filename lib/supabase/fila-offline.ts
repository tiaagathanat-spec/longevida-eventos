"use client";

// Fila offline de sincronização.
//
// Quando uma gravação falha por indisponibilidade de rede (a chamada ao
// Supabase lança exceção), as linhas afetadas são guardadas aqui em
// localStorage — marcadas com a tabela e o momento em que foram
// enfileiradas. A reconciliação acontece quando o navegador volta a ficar
// online (evento `online`) ou quando a aplicação reabre/recarrega.
//
// A fila só recebe falhas de REDE. Erros de dados (constraint) e de
// permissão (RLS, código 42501) NUNCA são enfileirados: seriam rejeitados
// para sempre. O upsert é idempotente (por id), então repetir uma linha
// enfileirada não causa duplicidade.
//
// O timestamp original e a origem da marcação são preservados porque a
// linha guardada é exatamente a que seria enviada (inclui capturadoEm e
// cronometrista). A reconciliação usa o próprio id como chave, portanto
// não inventa tempo novo nem duplica chegadas.

import { useEffect, useState } from "react";

export type ItemFilaOffline = {
  tabela: string;
  linha: Record<string, unknown>;
  enfileiradoEm: string;
};

const CHAVE = "longevida_offline_fila";
export const EVENTO_MUDANCA_FILA = "longevida:fila-offline";

function armazenamento(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
}

export function lerFilaOffline(): ItemFilaOffline[] {
  const store = armazenamento();
  if (!store) return [];
  try {
    const bruto = store.getItem(CHAVE);
    if (!bruto) return [];
    const parsed = JSON.parse(bruto);
    return Array.isArray(parsed) ? (parsed as ItemFilaOffline[]) : [];
  } catch {
    return [];
  }
}

function salvarFila(itens: ItemFilaOffline[]) {
  const store = armazenamento();
  if (!store) return;
  try {
    if (itens.length === 0) store.removeItem(CHAVE);
    else store.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    // Armazenamento indisponível (ex.: modo privado): a marcação continua
    // em memória; perde-se apenas a sobrevivência entre recargas.
  }
}

export function notificarMudancaFila() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_MUDANCA_FILA));
}

export function enfileirarFila(tabela: string, linha: Record<string, unknown>) {
  const atual = lerFilaOffline();
  atual.push({ tabela, linha, enfileiradoEm: new Date().toISOString() });
  salvarFila(atual);
  notificarMudancaFila();
}

export function obterPendentesFila(tabela?: string): ItemFilaOffline[] {
  if (!tabela) return lerFilaOffline();
  return lerFilaOffline().filter((i) => i.tabela === tabela);
}

export function totalPendentesFila(tabela?: string): number {
  return obterPendentesFila(tabela).length;
}

export function removerDaFila(tabela: string, id: unknown) {
  const restantes = lerFilaOffline().filter(
    (i) => !(i.tabela === tabela && i.linha.id === id)
  );
  salvarFila(restantes);
}

export function limparFila() {
  salvarFila([]);
  notificarMudancaFila();
}

// Hook de exibição: número de itens pendentes da tabela, atualizado por
// eventos da própria fila, por mudanças em outras abas (storage) e pela
// mudança de conectividade.
export function usePendentesOffline(tabela?: string) {
  const [pendentes, setPendentes] = useState(() => totalPendentesFila(tabela));

  useEffect(() => {
    const atualizar = () => setPendentes(totalPendentesFila(tabela));
    atualizar();
    window.addEventListener(EVENTO_MUDANCA_FILA, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_MUDANCA_FILA, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [tabela]);

  return pendentes;
}
