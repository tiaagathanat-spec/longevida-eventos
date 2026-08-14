"use client";

import { useMemo, useState } from "react";
import { Globe, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import {
  useProvas,
  situacaoDaProva,
  SITUACAO_PROVA_LABEL,
  SITUACAO_PROVA_CLASSE,
} from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { usePublicacoes } from "@/lib/mock/publicacoes-store";
import { classificarPorGrupos } from "@/lib/mock/classificacao-grupos";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TabelaClassificacaoGrupos } from "@/components/classificacao/tabela-classificacao-grupos";

// Módulo Publicação dos Resultados.
//
// Mostra todas as provas de todos os eventos, cada uma com um botão
// "Publicar Resultado". Reaproveita o mecanismo já existente de
// publicação (lib/mock/publicacoes-store.tsx, Etapa 16) — a mesma
// ação que já trava a edição de tempo em outras telas e libera a
// classificação para o Portal do Atleta (lib/mock/... "Meus
// Resultados", que já checa `estaPublicado` desde a Etapa 17). Não
// alterei nenhum desses arquivos.
//
// Antes de publicada, apenas Admin e Organização enxergam a
// classificação — o que já é verdade hoje, porque essa tela vive na
// área administrativa e a tela de Classificação da Organização também
// não é pública; a publicação só controla a visibilidade para o
// atleta.

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PublicacaoResultadosPage() {
  const { eventos } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { atletas } = useAtletas();
  const { obterPorInscricao } = useResultados();
  const { estaPublicado, obterDataPublicacao, publicar, despublicar } = usePublicacoes();

  const [expandida, setExpandida] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<{ provaId: string; acao: "publicar" | "despublicar" } | null>(
    null
  );

  function nomeEvento(id: string) {
    return eventos.find((e) => e.id === id)?.nome ?? "—";
  }
  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  function classificacaoDaProva(provaId: string) {
    const prova = provas.find((p) => p.id === provaId);
    const inscritos = inscricoes.filter((i) => i.provaId === provaId && i.status === "confirmada");
    const comTempo = inscritos
      .map((inscricao) => ({
        inscricao,
        tempo: obterPorInscricao(inscricao.id)?.tempo ?? "",
        atleta: atletas.find((a) => a.nome === inscricao.atletaNome),
        categoria: prova ? categorias.find((c) => c.id === prova.categoriaId) : undefined,
      }))
      .filter((i) => i.tempo.trim() !== "");
    return classificarPorGrupos(
      comTempo.map(({ inscricao, tempo, atleta, categoria }) => ({
        item: inscricao,
        tempo,
        atleta,
        categoria,
      }))
    );
  }

  // Regra central 10: a publicação só fica disponível quando todos os
  // tempos da prova estiverem aprovados na Revisão de Resultados.
  function statusRevisaoDaProva(provaId: string) {
    const inscritos = inscricoes.filter((i) => i.provaId === provaId && i.status === "confirmada");
    const comTempo = inscritos
      .map((inscricao) => obterPorInscricao(inscricao.id))
      .filter((r): r is NonNullable<typeof r> => !!r?.tempo);
    const aprovados = comTempo.filter((r) => r.revisao === "aprovado").length;
    const pendentes = comTempo.filter((r) => r.revisao !== "aprovado");
    return { total: comTempo.length, aprovados, pendentes };
  }

  // Provas ordenadas: evento, depois horário.
  const provasOrdenadas = useMemo(
    () =>
      [...provas].sort((a, b) => {
        const eventoCompare = nomeEvento(a.eventoId).localeCompare(nomeEvento(b.eventoId));
        if (eventoCompare !== 0) return eventoCompare;
        return (a.horario ?? "").localeCompare(b.horario ?? "");
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provas, eventos]
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Publicação dos Resultados
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Publique a classificação de cada prova para liberar a visualização no Portal do Atleta.
        </p>
      </header>

      {provasOrdenadas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma prova cadastrada ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {provasOrdenadas.map((prova) => {
            const publicada = estaPublicado(prova.id);
            const dataPublicacao = obterDataPublicacao(prova.id);
            const situacao = situacaoDaProva(prova);
            const provaEncerrada = situacao === "encerrada";
            const grupos = classificacaoDaProva(prova.id);
            const temTempos = grupos.some((g) => g.classificacao.length > 0);
            const estaExpandida = expandida === prova.id;
            const revisao = statusRevisaoDaProva(prova.id);
            const publicacaoBloqueada =
              (revisao.total > 0 && revisao.pendentes.length > 0) || !provaEncerrada;

            return (
              <div
                key={prova.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {nomeEvento(prova.eventoId)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {nomeModalidade(prova.modalidadeId)} · {nomeCategoria(prova.categoriaId)}
                      {prova.horario ? ` · ${prova.horario}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${SITUACAO_PROVA_CLASSE[situacao]}`}
                    >
                      {SITUACAO_PROVA_LABEL[situacao]}
                    </span>

                    <span
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        publicada
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {publicada ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {publicada ? "Publicado" : "Não publicado"}
                    </span>

                    <Button
                      variant="ghost"
                      onClick={() => setExpandida(estaExpandida ? null : prova.id)}
                      aria-label="Ver classificação"
                    >
                      {estaExpandida ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>

                    {publicada ? (
                      <Button
                        variant="ghost"
                        className="text-slate-500"
                        onClick={() => setConfirmando({ provaId: prova.id, acao: "despublicar" })}
                      >
                        Despublicar
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setConfirmando({ provaId: prova.id, acao: "publicar" })}
                        disabled={!temTempos || publicacaoBloqueada}
                        title={
                          !provaEncerrada
                            ? "Encerre a prova (Realizada) antes de publicar os resultados."
                            : publicacaoBloqueada
                              ? "Publique apenas depois de aprovar todos os resultados na Revisão de Resultados."
                              : undefined
                        }
                      >
                        Publicar Resultado
                      </Button>
                    )}
                  </div>
                </div>

                {publicada && dataPublicacao && (
                  <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Publicado em {formatarDataHora(dataPublicacao)}
                  </div>
                )}

                {!provaEncerrada && (
                  <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    Prova ainda não encerrada — o ranking e as medalhas só são definidos após o
                    encerramento da prova e a publicação.
                  </div>
                )}

                {!publicada && !publicacaoBloqueada && revisao.total > 0 && revisao.pendentes.length === 0 && (
                  <div className="border-t border-slate-100 px-4 py-2 text-xs text-brand-green dark:border-slate-800">
                    Todos os resultados foram aprovados na Revisão de Resultados — pronto para
                    publicar.
                  </div>
                )}

                {publicacaoBloqueada && provaEncerrada && (
                  <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    Publicação bloqueada: {revisao.pendentes.length} de {revisao.total}{" "}
                    resultado(s) ainda aguardando aprovação na Revisão de Resultados.
                  </div>
                )}

                {estaExpandida && (
                  <div className="border-t border-slate-100 dark:border-slate-800">
                    {!temTempos ? (
                      <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        Nenhum tempo lançado para esta prova ainda.
                      </p>
                    ) : (
                      <div className="p-4">
                        <TabelaClassificacaoGrupos grupos={grupos} oficial={publicada && provaEncerrada} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmando}
        title={confirmando?.acao === "publicar" ? "Publicar resultado" : "Despublicar resultado"}
        description={
          confirmando?.acao === "publicar"
            ? "Os atletas passarão a ver esta classificação no Portal do Atleta. Deseja continuar?"
            : "A classificação deixa de ficar visível para os atletas até ser publicada novamente."
        }
        confirmLabel={confirmando?.acao === "publicar" ? "Publicar" : "Despublicar"}
        onCancel={() => setConfirmando(null)}
        onConfirm={() => {
          if (!confirmando) return;
          if (confirmando.acao === "publicar") publicar(confirmando.provaId);
          else despublicar(confirmando.provaId);
          setConfirmando(null);
        }}
      />
    </div>
  );
}
