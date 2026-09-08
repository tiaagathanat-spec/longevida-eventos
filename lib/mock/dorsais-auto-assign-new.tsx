"use client";

import { useEffect } from "react";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useDorsais } from "@/lib/mock/dorsais-store";

export function DorsaisAutoAssignNew() {
  const { inscricoes, atualizar: atualizarInscricao } = useInscricoes();
  const { provas } = useProvas();
  const { dorsais, obterPorInscricao, registrar } = useDorsais();

  useEffect(() => {
    const numerosPorProva: Record<string, Set<number>> = {};
    for (const dorsal of dorsais) {
      const provaId = dorsal.provaId;
      if (!numerosPorProva[provaId]) {
        numerosPorProva[provaId] = new Set();
      }
      numerosPorProva[provaId].add(dorsal.numero);
    }

    const confirmadas = inscricoes.filter((i) => i.status === "confirmada");
    const semDorsal = confirmadas.filter((i) => !obterPorInscricao(i.id));

    for (const inscricao of semDorsal) {
      const prova = provas.find((p) => p.id === inscricao.provaId);
      if (!prova) continue;

      const chave = inscricao.provaId;
      if (!numerosPorProva[chave]) {
        numerosPorProva[chave] = new Set();
      }
      const usados = numerosPorProva[chave];

      let proximoNumero = 1;
      while (usados.has(proximoNumero)) {
        proximoNumero = proximoNumero + 1;
      }

      usados.add(proximoNumero);
      registrar(inscricao.id, proximoNumero, inscricao.provaId);
      atualizarInscricao(inscricao.id, { numeroPeito: String(proximoNumero) });
    }

    for (const dorsal of dorsais) {
      const inscricao = inscricoes.find((i) => i.id === dorsal.inscricaoId);
      if (inscricao && inscricao.numeroPeito !== String(dorsal.numero)) {
        atualizarInscricao(inscricao.id, { numeroPeito: String(dorsal.numero) });
      }
    }
  }, [
    inscricoes,
    provas,
    dorsais,
    obterPorInscricao,
    registrar,
    atualizarInscricao,
  ]);

  return null;
}
