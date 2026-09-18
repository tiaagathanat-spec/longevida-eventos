"use client";

// Motor de atribuição automática de dorsais.
//
// Este componente não renderiza nada — ele observa as Inscrições e as
// Faixas de Numeração e mantém os números de peito sempre coerentes:
//
//  1. Inscrição CONFIRMADA sem dorsal → atribui o próximo número livre
//     dentro da faixa configurada para o grupo daquela inscrição.
//  2. Dorsal existente cujo número ficou FORA da faixa do grupo (o admin
//     mudou os intervalos) ou DUPLICADO com outro dorsal do mesmo grupo
//     → reatribui o próximo número livre dentro da faixa, preservando a
//     ordem atual. É assim que uma alteração feita na tela passa a valer
//     sem precisar mexer no banco.
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
import {
  reconciliarNumerosDoGrupo,
  reconciliarNumerosDaProva,
  type DorsalDaProva,
  type FaixaParaReconciliar,
} from "@/lib/mock/dorsais-reconciliar";

export function DorsaisAutoAssign() {
  const { inscricoes, atualizar: atualizarInscricao } = useInscricoes();
  const { provas } = useProvas();
  const { atletas } = useAtletas();
  const { categorias } = useCategorias();
  const { obterCriterio, obter: obterFaixa } = useFaixasNumeracao();
  const { dorsais, registrar, atualizarNumero, atualizarNumeroDoDorsal } =
    useDorsais();

  useEffect(() => {
    // Números já atribuídos em execuções anteriores, agrupados por faixa
    // (evento + grupo) — evita confundir faixas de eventos/grupos
    // diferentes que por acaso usem números parecidos.
    const numerosPorFaixa = new Map<string, Set<number>>();
    // Números em uso na PROVA INTEIRA. O banco exige UNIQUE(prova_id,
    // numero); como a numeração é por faixa/grupo, grupos sobrepostos na
    // mesma prova poderiam alocar o mesmo número. Este mapa global por
    // prova impede essa colisão (causa do erro "chave duplicada").
    const numerosDaProva = new Map<string, Set<number>>();
    // Grupo/faixa de cada dorsal existente (chave `eventoId::grupoId`).
    const chaveDoDorsal = new Map<string, string>();
    for (const dorsal of dorsais) {
      const inscricao = inscricoes.find((i) => i.id === dorsal.inscricaoId);
      if (!inscricao || inscricao.status !== "confirmada") continue;
      const prova = provas.find((p) => p.id === inscricao.provaId);
      if (!prova) continue;
      const atleta = atletas.find((a) => a.nome === inscricao.atletaNome);
      const categoria = categorias.find((c) => c.id === prova.categoriaId);
      const grupo = resolverGrupoNumeracao(
        obterCriterio(inscricao.eventoId),
        categoria,
        atleta
      );
      if (!grupo.grupoId) continue;
      const chave = `${inscricao.eventoId}::${grupo.grupoId}`;
      chaveDoDorsal.set(dorsal.id, chave);
      const set = numerosPorFaixa.get(chave) ?? new Set<number>();
      set.add(dorsal.numero);
      numerosPorFaixa.set(chave, set);
      const setProva = numerosDaProva.get(inscricao.provaId) ?? new Set<number>();
      setProva.add(dorsal.numero);
      numerosDaProva.set(inscricao.provaId, setProva);
    }

    // 1. Atribui números às inscrições confirmadas que ainda não têm dorsal
    //    na PRÓPRIA PROVA (uma inscrição tem, no máximo, um dorsal por prova).
    inscricoes
      .filter((inscricao) => inscricao.status === "confirmada")
      .filter(
        (inscricao) =>
          !dorsais.some(
            (d) =>
              d.inscricaoId === inscricao.id &&
              d.provaId === inscricao.provaId
          )
      )
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
        // intervalo que ainda não foi usado — nem na própria faixa nem na
        // prova inteira (o banco bloqueia números duplicados por prova).
        const chave = `${inscricao.eventoId}::${grupo.grupoId}`;
        const usados = numerosPorFaixa.get(chave) ?? new Set<number>();
        const usadosNaProva =
          numerosDaProva.get(inscricao.provaId) ?? new Set<number>();

        let proximoNumero = faixa.numeroInicial;
        while (
          usados.has(proximoNumero) ||
          usadosNaProva.has(proximoNumero)
        ) {
          proximoNumero += 1;
        }
        if (proximoNumero > faixa.numeroFinal) return; // faixa esgotada

        usados.add(proximoNumero);
        usadosNaProva.add(proximoNumero);
        registrar(inscricao.id, proximoNumero, inscricao.provaId);
        // Mantém `numeroPeito` da inscrição em sincronia com o dorsal
        // atribuído, para que todas as telas que exibem o número
        // (Financeiro, Cronometragem, Classificação, Relatórios) leiam o
        // mesmo valor.
        atualizarInscricao(inscricao.id, { numeroPeito: String(proximoNumero) });
      });

    // Assistente de faixa por dorsal (id -> faixa), para a renumeração por
    // prova abaixo não depender do grupo/fluxo interno.
    const faixaDoDorsal = new Map<string, FaixaParaReconciliar>();
    for (const [dorsalId, chave] of chaveDoDorsal) {
      const [eventoId, grupoId] = chave.split("::") as [string, string];
      const faixa = obterFaixa(eventoId, grupoId);
      if (faixa) faixaDoDorsal.set(dorsalId, faixa);
    }
    // Números atribuídos nesta execução, por prova — reservados em ambas
    // as reconciliações para não serem reutilizados.
    const numerosNovosDaProva = new Map<string, number[]>();
    for (const [provaId, usadosNaProva] of numerosDaProva) {
      const novos = [...usadosNaProva].filter((n) =>
        [...dorsais].every((d) => d.numero !== n)
      );
      if (novos.length > 0) numerosNovosDaProva.set(provaId, novos);
    }

    // 2. Reconciliação por faixa: renumera dorsais existentes fora da
    //    faixa do grupo ou duplicados dentro dela. Processa cada faixa de
    //    forma determinística (módulo puro lib/mock/dorsais-reconciliar).
    for (const [chave, todosUsados] of numerosPorFaixa) {
      const [eventoId, grupoId] = chave.split("::") as [string, string];
      const faixa = obterFaixa(eventoId, grupoId);
      if (!faixa) continue;

      const dorsaisDoGrupo = dorsais.filter(
        (d) => chaveDoDorsal.get(d.id) === chave
      );
      // Números atribuídos nesta execução (inscrições novas) não podem
      // ser reutilizados: são os usados da faixa que não pertencem a
      // nenhum dorsal antigo.
      const numerosDosAntigos = new Set(
        dorsaisDoGrupo.map((d) => d.numero)
      );
      const numerosNovos = [...todosUsados].filter(
        (n) => !numerosDosAntigos.has(n)
      );

      const mudancas = reconciliarNumerosDoGrupo(
        faixa,
        dorsaisDoGrupo,
        numerosNovos
      );
      for (const [dorsalId, novoNumero] of mudancas) {
        const dorsal = dorsais.find((d) => d.id === dorsalId);
        if (!dorsal) continue;
        atualizarNumero(dorsal.inscricaoId, novoNumero);
        atualizarInscricao(dorsal.inscricaoId, {
          numeroPeito: String(novoNumero),
        });
      }
    }

    // 2.5 Reconciliação POR PROVA: garante unicidade dentro da prova como
    //     um todo (o banco exige UNIQUE(prova_id, numero)). Grupos com
    //     faixas sobrepostas na MESMA prova poderiam ter duplicado um
    //     número; mantém o dorsal mais antigo e renumera os demais.
    const dorsaisPorProva = new Map<string, DorsalDaProva[]>();
    for (const dorsal of dorsais) {
      const inscricao = inscricoes.find((i) => i.id === dorsal.inscricaoId);
      if (!inscricao || inscricao.status !== "confirmada") continue;
      const lista = dorsaisPorProva.get(inscricao.provaId) ?? [];
      lista.push({
        id: dorsal.id,
        inscricaoId: dorsal.inscricaoId,
        numero: dorsal.numero,
        atribuidoEm: dorsal.atribuidoEm,
      });
      dorsaisPorProva.set(inscricao.provaId, lista);
    }
    for (const [provaId, lista] of dorsaisPorProva) {
      const mudancas = reconciliarNumerosDaProva(
        lista,
        faixaDoDorsal,
        numerosNovosDaProva.get(provaId) ?? []
      );
      for (const [dorsalId, novoNumero] of mudancas) {
        const dorsal = dorsais.find((d) => d.id === dorsalId);
        if (!dorsal) continue;
        atualizarNumeroDoDorsal(dorsalId, novoNumero);
        atualizarInscricao(dorsal.inscricaoId, {
          numeroPeito: String(novoNumero),
        });
      }
    }

    // 3. Mantém o `numeroPeito` da inscrição em sincronia com o dorsal já
    //    atribuído — importante após a carga do banco, quando a inscrição
    //    chega sem o espelho (o dorsal vem da tabela app_dorsais).
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
    registrar,
    atualizarNumero,
    atualizarNumeroDoDorsal,
    obterCriterio,
    obterFaixa,
    atualizarInscricao,
  ]);

  return null;
}