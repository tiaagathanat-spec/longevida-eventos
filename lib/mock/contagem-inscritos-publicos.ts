"use client";

// Contagem pública de inscritos confirmados por evento.
//
// Fonte primária: RPC `app_inscritos_publicos(evento_id)` (migration 0009),
// que expõe APENAS a quantidade de inscrições confirmadas — nenhuma linha
// individual da tabela sensível `app_inscricoes` chega ao site público.
//
// Fallback: enquanto a função ainda não existir no banco (0009 não aplicada),
// usa a contagem local do store de inscrições para o contador não quebrar no
// site público.

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useInscricoes } from "@/lib/mock/inscricoes-store";

/**
 * Contagem pública de inscritos confirmados para uma lista de eventos.
 * `contagens[eventoId]` tem precedência da RPC; onde a RPC não respondeu
 * (função ainda ausente no banco), vale a contagem local do store.
 */
export function useContagensInscritosPublicas(
  eventoIds: string[]
): { contagens: Record<string, number>; carregando: boolean } {
  const { inscricoes } = useInscricoes();

  const contagemLocal = useMemo(() => {
    const mapa: Record<string, number> = {};
    const confirmadas = (inscricoes ?? []).filter((i) => i.status === "confirmada");
    for (const id of eventoIds) {
      mapa[id] = confirmadas.filter((i) => i.eventoId === id).length;
    }
    return mapa;
  }, [eventoIds, inscricoes]);

  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(eventoIds.length > 0);

  useEffect(() => {
    if (eventoIds.length === 0) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);

    async function carregar() {
      const supabase = createClient();
      const entradas = await Promise.all(
        eventoIds.map(async (id) => {
          const { data, error } = await supabase.rpc("app_inscritos_publicos", {
            p_evento_id: id,
          });
          if (error || typeof data !== "number") return null;
          return [id, data] as const;
        })
      );
      if (!ativo) return;
      setContagens(() => {
        const proximo: Record<string, number> = {};
        for (const item of entradas) {
          if (item) proximo[item[0]] = item[1];
        }
        return proximo;
      });
      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [eventoIds]);

  // A RPC tem precedência; onde ela não respondeu, vale a contagem local.
  const efetivas = useMemo(
    () => ({ ...contagemLocal, ...contagens }),
    [contagemLocal, contagens]
  );

  return { contagens: efetivas, carregando };
}

/** Contagem pública de inscritos confirmados de um único evento. */
export function useContagemInscritosPublica(
  eventoId: string
): { inscritos: number; carregando: boolean } {
  const ids = useMemo(() => [eventoId], [eventoId]);
  const { contagens, carregando } = useContagensInscritosPublicas(ids);
  return { inscritos: contagens[eventoId] ?? 0, carregando };
}
