"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Trophy, Medal, Clock3 } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { usePublicacoes } from "@/lib/mock/publicacoes-store";
import { classificarPorGrupos } from "@/lib/mock/classificacao-grupos";
import { useSessao } from "@/lib/mock/sessao";

const MEDALHA: Record<number, string> = {
  1: "text-amber-500",
  2: "text-slate-400",
  3: "text-orange-700",
};

export default function MeusResultadosPage() {
  const { sessao } = useSessao();
  const { eventos } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { atletas } = useAtletas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao } = useResultados();
  const { estaPublicado } = usePublicacoes();

  const meusNomesDeAtletas = useMemo(
    () =>
      new Set(
        atletas
          .filter((a) => a.responsavelNome === sessao.nome)
          .map((a) => a.nome)
      ),
    [atletas, sessao.nome]
  );

  // Só mostramos resultados de provas cujo resultado já foi publicado
  // pela Organização (respeita o fluxo de publicação da Etapa 16).
  const meusResultados = useMemo(() => {
    return inscricoes
      .filter(
        (i) =>
          meusNomesDeAtletas.has(i.atletaNome) &&
          i.status === "confirmada" &&
          estaPublicado(i.provaId)
      )
      .map((inscricao) => {
        const prova = provas.find((p) => p.id === inscricao.provaId);
        const evento = eventos.find((e) => e.id === inscricao.eventoId);
        const tempo = obterPorInscricao(inscricao.id)?.tempo ?? "";

        // Classificação recalculada entre todos os confirmados da mesma
        // prova, dividida por grupo (categoria · idade · sexo) — a
        // colocação do atleta é dentro do próprio grupo. Resultados só
        // aparecem publicados (prova realizada), então a colocação já é
        // a oficial.
        const provaDaInscricao = provas.find((p) => p.id === inscricao.provaId);
        const todosDaProva = inscricoes.filter(
          (o) => o.provaId === inscricao.provaId && o.status === "confirmada"
        );
        const grupos = classificarPorGrupos(
          todosDaProva
            .map((o) => ({
              item: o,
              tempo: obterPorInscricao(o.id)?.tempo ?? "",
              atleta: atletas.find((a) => a.nome === o.atletaNome),
              categoria: provaDaInscricao
                ? categorias.find((c) => c.id === provaDaInscricao.categoriaId)
                : undefined,
            }))
            .filter((o) => o.tempo.trim() !== "")
        );
        const colocacao =
          grupos
            .find((g) => g.classificacao.some((r) => r.item.id === inscricao.id))
            ?.classificacao.find((r) => r.item.id === inscricao.id)?.colocacao ?? null;

        return { inscricao, prova, evento, tempo, colocacao };
      })
      .filter((r) => r.tempo.trim() !== "");
  }, [
    inscricoes,
    meusNomesDeAtletas,
    provas,
    eventos,
    atletas,
    categorias,
    obterPorInscricao,
    estaPublicado,
  ]);

  function nomeModalidade(id?: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id?: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Meus resultados
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Resultados oficiais já publicados dos seus atletas.
        </p>
      </header>

      {meusResultados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <Clock3 className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Nenhum resultado publicado ainda para os seus atletas.
          </p>
          <Link href="/portal/minhas-inscricoes" className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline">
            Ver minhas inscrições
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {meusResultados.map(({ inscricao, prova, evento, tempo, colocacao }) => (
            <div
              key={inscricao.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    colocacao && colocacao <= 3
                      ? `${MEDALHA[colocacao]} bg-current/10`
                      : "bg-brand-blue/10 text-brand-blue"
                  }`}
                >
                  {colocacao && colocacao <= 3 ? (
                    <Medal className="h-[18px] w-[18px]" />
                  ) : (
                    <Trophy className="h-[18px] w-[18px]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {inscricao.atletaNome}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {evento?.nome} · {nomeModalidade(prova?.modalidadeId)} ·{" "}
                    {nomeCategoria(prova?.categoriaId)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{tempo}</p>
                {colocacao && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{colocacao}º lugar</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
