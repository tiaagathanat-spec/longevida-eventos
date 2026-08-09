"use client";

// Motor de atribuição automática de dorsais.
//
// Este componente não renderiza nada — ele observa as Inscrições e,
// sempre que encontra uma inscrição CONFIRMADA que ainda não tem um
// número de peito, atribui automaticamente o próximo número disponível
// dentro da faixa configurada para o grupo daquela inscrição.
//
// O grupo segue o critério escolhido pelo administrador no evento
// (faixas-numeracao-store): por CATEGORIA da prova ou por IDADE do
// atleta (faixa etária).
//
// Importante: não modifica lib/mock/inscricoes-store.tsx nem nenhum
// outro store existente — só *lê* o estado deles e escreve no store
// próprio do módulo (dorsais-store), preservando 100% do comportamento
// já existente do sistema.

import { useEffect } from "react";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import {
  useFaixasNumeracao,
  resolverGrupoNumeracao,
} from "@/lib/mock/faixas-numeracao-store";
import { useDorsais } from "@/lib/mock/dorsais-store";

export function DorsaisAutoAssign() {
  const { inscricoes, atualizar: atualizarInscricao } = useInscricoes();
  const { provas } = useProvas();
  const { atletas } = useAtletas();
  const { categorias } = useCategorias();
  const { obterCriterio, obter: obterFaixa } = useFaixasNumeracao();
  const { dorsais, obterPorInscricao, registrar } = useDorsais();

  useEffect(() => {
    // Números já atribuídos em execuções anteriores, agrupados por faixa
    // (evento + grupo) — evita confundir faixas de eventos/grupos
    // diferentes que por acaso usem números parecidos.
    const numerosPorFaixa = new Map<string, Set<number>>();
    for (const dorsal of dorsais) {
      const outraInscricao = inscricoes.find((i) => i.id === dorsal.inscricaoId);
      const outraProva = provas.find((p) => p.id === outraInscricao?.provaId);
      if (!outraInscricao || !outraProva) continue;
      const outroAtleta = atletas.find((a) => a.nome === outraInscricao.atletaNome);
      const outraCategoria = categorias.find((c) => c.id === outraProva.categoriaId);
      const grupo = resolverGrupoNumeracao(
        obterCriterio(outraInscricao.eventoId),
        outraCategoria,
        outroAtleta
      );
      const chave = `${outraInscricao.eventoId}::${grupo.grupoId}`;
      const set = numerosPorFaixa.get(chave) ?? new Set<number>();
      set.add(dorsal.numero);
      numerosPorFaixa.set(chave, set);
    }

    inscricoes
      .filter((inscricao) => inscricao.status === "confirmada")
      .filter((inscricao) => !obterPorInscricao(inscricao.id))
      .forEach((inscricao) => {
        const prova = provas.find((p) => p.id === inscricao.provaId);
        if (!prova) return;

        const atleta = atletas.find((a) => a.nome === inscricao.atletaNome);
        const categoria = categorias.find((c) => c.id === prova.categoriaId);
        const grupo = resolverGrupoNumeracao(
          obterCriterio(inscricao.eventoId),
          categoria,
          atleta
        );
        if (!grupo.grupoId) return;

        const faixa = obterFaixa(inscricao.eventoId, grupo.grupoId);
        if (!faixa) return; // grupo sem faixa configurada — aguarda o admin configurar

        // Próximo número livre dentro da faixa: o menor número do
        // intervalo que ainda não foi usado. O controle é feito dentro da
        // própria execução, para que duas inscrições do mesmo grupo
        // processadas juntas nunca recebam o mesmo número.
        const chave = `${inscricao.eventoId}::${grupo.grupoId}`;
        const usados = numerosPorFaixa.get(chave) ?? new Set<number>();

        let proximoNumero = faixa.numeroInicial;
        while (usados.has(proximoNumero)) proximoNumero += 1;
        if (proximoNumero > faixa.numeroFinal) return; // faixa esgotada

        usados.add(proximoNumero);
        registrar(inscricao.id, proximoNumero);
        // Mantém `numeroPeito` da inscrição em sincronia com o dorsal
        // atribuído, para que todas as telas que exibem o número
        // (Financeiro, Cronometragem, Classificação, Relatórios) leiam o
        // mesmo valor.
        atualizarInscricao(inscricao.id, { numeroPeito: String(proximoNumero) });
      });

    // Mantém o `numeroPeito` da inscrição em sincronia com o dorsal já
    // atribuído — importante após a carga do banco, quando a inscrição
    // chega sem o espelho (o dorsal vem da tabela app_dorsais).
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
    atletas,
    categorias,
    obterPorInscricao,
    registrar,
    obterCriterio,
    obterFaixa,
    atualizarInscricao,
  ]);

  return null;
}
