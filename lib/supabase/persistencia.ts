"use client";

// Camada de persistência real das stores mockadas (lib/mock/*-store.tsx).
//
// As tabelas-espelho (`app_*`) são criadas pela migration
// supabase/migrations/0005_persistencia_app.sql. Elas reproduzem o
// formato dos dados usados pelas telas, com a coluna id TEXT para
// manter compatibilidade com os dados de demonstração existentes.
//
// Como as tabelas usam snake_case e as telas camelCase, esta camada
// converte automaticamente nas duas direções.

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Linha = Record<string, unknown>;

function snakeParaCamel(linha: Linha): Linha {
  const saida: Linha = {};
  for (const [chave, valor] of Object.entries(linha)) {
    const camel = chave.replace(/_([a-z])/g, (_, letra: string) =>
      letra.toUpperCase()
    );
    saida[camel] = valor;
  }
  return saida;
}

function camelParaSnake(linha: Linha): Linha {
  const saida: Linha = {};
  for (const [chave, valor] of Object.entries(linha)) {
    const snake = chave.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
    saida[snake] = valor;
  }
  return saida;
}

// Omite campos `undefined` em vez de transformá-los em `null`: as
// tabelas-espelho usam `not null default ''`, e enviar `null` explícito
// viola a restrição (erro 400). Ao omitir a chave, o PostgREST aplica o
// default na criação e preserva o valor existente na edição (merge).
function limparJson<T>(valor: T): T {
  return JSON.parse(
    JSON.stringify(valor, (_chave, item) => (item === undefined ? undefined : item))
  ) as T;
}

// Carrega todas as linhas de uma tabela. Retorna `null` quando a tabela
// não existe ou a consulta falhou (o chamador mantém o seed em memória).
export async function carregar<T>(
  tabela: string,
  ordem?: string
): Promise<T[] | null> {
  try {
    const supabase = createClient();
    let query = supabase.from(tabela).select("*");
    if (ordem) query = query.order(ordem);
    const { data, error } = await query;
    if (error) return null;
    return ((data ?? []).map((l) => snakeParaCamel(l as Linha)) as T[]);
  } catch {
    return null;
  }
}

// Grava o array completo na tabela (upsert). Quando o array está vazio,
// remove todas as linhas da tabela (`chaveColuna` é a coluna de
// identidade em snake_case). Falhas são registradas no console sem
// derrubar a UI — o estado em memória continua funcionando.
export async function gravarLinhas<T>(
  tabela: string,
  linhas: T[],
  chaveColuna: string = "id"
): Promise<void> {
  try {
    const supabase = createClient();
    if (linhas.length === 0) {
      const { error } = await supabase.from(tabela).delete().neq(chaveColuna, "");
      if (error && error.code !== "42P01") {
        console.warn(`[persistencia] limpar tabela ${tabela}:`, error.message);
      }
      return;
    }
    const { error } = await supabase
      .from(tabela)
      .upsert(linhas.map((l) => limparJson(camelParaSnake(l as Linha))));
    if (error && error.code !== "42P01") {
      console.warn(`[persistencia] gravar ${tabela}:`, error.message);
    }
  } catch (err) {
    console.warn(`[persistencia] falha ao gravar ${tabela}:`, err);
  }
}

type OpcoesPersistencia<T> = {
  // Coluna de ordenação da carga (snake_case). Opcional.
  ordem?: string;
  // Campo de identidade no objeto da tela (default: "id").
  idCampo?: keyof T;
  // Coluna de identidade no banco em snake_case (default: "id").
  idColuna?: string;
};

// Hook de persistência para substituir `useState` nas stores.
//
// Retorna a mesma interface de `useState` (`dados`/`setDados`) e um
// flag `pronto`. Na montagem carrega as linhas do banco; a partir daí,
// cada alteração em `dados` é sincronizada: linhas removidas são
// apagadas do banco e as demais são feitas upsert.
export function usePersistencia<T>(
  tabela: string,
  estadoInicial: T[],
  opcoes: OpcoesPersistencia<T> = {}
) {
  const { ordem, idCampo = "id" as keyof T, idColuna = "id" } = opcoes;
  const [dados, setDados] = useState<T[]>(estadoInicial);
  const [pronto, setPronto] = useState(false);
  const prontoRef = useRef(false);
  const ultimoSincronizadoRef = useRef<T[]>(estadoInicial);

  useEffect(() => {
    let ativo = true;
    carregar<T>(tabela, ordem)
      .then((linhas) => {
        if (!ativo || linhas === null) return;
        prontoRef.current = true;
        ultimoSincronizadoRef.current = linhas;
        setDados(linhas);
      })
      .catch(() => {})
      .finally(() => {
        if (ativo) prontoRef.current = true;
      });
    return () => {
      ativo = false;
    };
  }, [tabela, ordem]);

  useEffect(() => {
    if (!prontoRef.current) return;
    const anterior = ultimoSincronizadoRef.current;
    if (anterior === dados) return;

    const chave = idCampo as string;
    const chaveAntes = new Set(anterior.map((x) => (x as Linha)[chave] as string));
    const chaveDepois = new Set(dados.map((x) => (x as Linha)[chave] as string));
    const removidos = [...chaveAntes].filter((id) => !chaveDepois.has(id));

    if (removidos.length > 0) {
      const supabase = createClient();
      supabase.from(tabela).delete().in(idColuna, removidos).then(({ error }) => {
        if (error && error.code !== "42P01") {
          console.warn(`[persistencia] remover ${tabela}:`, error.message);
        }
      });
    }
    gravarLinhas<T>(tabela, dados, idColuna);
    ultimoSincronizadoRef.current = dados;
  }, [tabela, dados, idCampo, idColuna]);

  return { dados, setDados, pronto };
}
