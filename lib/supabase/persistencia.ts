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

import { useCallback, useEffect, useRef, useState } from "react";
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

// Grava as linhas na tabela, uma por uma, e retorna `true` se todas
// foram persistidas. O upsert individual é necessário porque o PostgREST
// exige que todas as linhas de um array tenham as mesmas chaves: linhas
// recém-criadas nas telas têm menos campos que as carregadas do banco, e
// o array misto fazia o PostgREST preencher as chaves ausentes com NULL,
// violando colunas `not null default ''` (erro 400). No upsert individual,
// campos ausentes usam o default na criação e são preservados na edição
// (merge).
//
// SEGURANÇA (RLS por organização/evento):
//   * Array vazio NÃO apaga a tabela. Remoções são responsabilidade do
//     diff de ids em `usePersistencia`; um array vazio aqui jamais
//     autoriza operação destrutiva.
//   * Erro de permissão (42501) = linha fora do escopo do usuário: a
//     linha é PULADA e a gravação continua (o usuário só persiste o que
//     realmente pode alterar), mas o retorno vira `false` — o bloqueio
//     RLS nunca é tratado como sucesso e a base de sincronização não
//     avança (a linha não persistida é reenviada na próxima mudança).
//   * Demais erros (constraint etc.) abortam a gravação e retornam
//     `false`, como antes.
//   * Erro 42P01 (tabela ainda não criada) continua sendo ignorado.
export async function gravarLinhas<T>(
  tabela: string,
  linhas: T[],
  chaveColuna: string = "id"
): Promise<boolean> {
  try {
    const supabase = createClient();
    if (linhas.length === 0) {
      return true;
    }
    let bloqueioRls = false;
    for (const linha of linhas) {
      const { error } = await supabase
        .from(tabela)
        .upsert(limparJson(camelParaSnake(linha as Linha)));
      if (error && error.code !== "42P01") {
        if (error.code === "42501") {
          console.warn(
            `[persistencia] linha fora do escopo, ignorada em ${tabela}:`,
            error.message
          );
          bloqueioRls = true;
          continue;
        }
        console.warn(`[persistencia] gravar ${tabela}:`, error.message);
        return false;
      }
    }
    return !bloqueioRls;
  } catch (err) {
    console.warn(`[persistencia] falha ao gravar ${tabela}:`, err);
    return false;
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
  const usuarioEditouRef = useRef(false);

  // Marca que o usuário já alterou dados antes de a carga terminar, para
  // a carga não sobrescrever essas edições (as mudanças são sincronizadas
  // logo em seguida pela lógica de persistência).
  const setDadosComControle = useCallback(
    (atualizacao: T[] | ((anterior: T[]) => T[])) => {
      usuarioEditouRef.current = true;
      setDados(atualizacao);
    },
    []
  );

  useEffect(() => {
    let ativo = true;
    carregar<T>(tabela, ordem)
      .then((linhas) => {
        if (!ativo || linhas === null) return;
        if (usuarioEditouRef.current) return;
        ultimoSincronizadoRef.current = linhas;
        setDados(linhas);
      })
      .catch(() => {})
      .finally(() => {
        if (ativo) {
          prontoRef.current = true;
          setPronto(true);
        }
      });
    return () => {
      ativo = false;
    };
  }, [tabela, ordem]);

  // Sincroniza as mudanças de `dados` com o banco. Só avança a linha de
  // base (`ultimoSincronizadoRef`) quando a gravação teve sucesso: assim,
  // uma falha não "esconde" dados não persistidos (que seriam perdidos ao
  // recarregar a página) e a próxima mudança tenta sincronizar de novo.
  useEffect(() => {
    if (!prontoRef.current) return;
    const anterior = ultimoSincronizadoRef.current;
    if (anterior === dados) return;

    const chave = idCampo as string;
    const chaveAntes = new Set(anterior.map((x) => (x as Linha)[chave] as string));
    const chaveDepois = new Set(dados.map((x) => (x as Linha)[chave] as string));
    const removidos = [...chaveAntes].filter((id) => !chaveDepois.has(id));

    const remocao =
      removidos.length > 0
        ? createClient().from(tabela).delete().in(idColuna, removidos)
        : Promise.resolve({ error: null });

    Promise.all([remocao, gravarLinhas<T>(tabela, dados, idColuna)]).then(
      ([{ error: erroRemocao }, gravado]) => {
        const falhouRemocao = !!erroRemocao && erroRemocao.code !== "42P01";
        if (falhouRemocao) {
          console.warn(`[persistencia] remover ${tabela}:`, erroRemocao.message);
        }
        if (gravado && !falhouRemocao) {
          ultimoSincronizadoRef.current = dados;
        }
      }
    );
  }, [tabela, dados, idCampo, idColuna, pronto]);

  return { dados, setDados: setDadosComControle, pronto };
}
