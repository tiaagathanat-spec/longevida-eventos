"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Flag,
  ListChecks,
  Play,
  RotateCcw,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useTiposProva } from "@/lib/mock/tipos-prova-store";
import {
  useProvas,
  situacaoDaProva,
  SITUACAO_PROVA_LABEL,
  SITUACAO_PROVA_CLASSE,
} from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { useUsuarioOrganizacao } from "@/lib/supabase/usuario-organizacao";
import { Button } from "@/components/ui/button";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

export default function OrganizacaoProvasPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { tiposProva, erro: erroTiposProva } = useTiposProva();
  const { provas, definirSituacao, erro: erroProvas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao: obterDorsal } = useDorsais();
  const { nome: nomeOperador } = useUsuarioOrganizacao();

  const evento = obterEvento(eventoId);
  const provasDoEvento = useMemo(
    () => provas.filter((p) => p.eventoId === eventoId),
    [provas, eventoId]
  );

  // Contadores operacionais por prova (confirmados, check-in e medalhas)
  // para o painel de operação do dia do evento.
  const totaisPorProva = useMemo(() => {
    const mapa: Record<string, { inscritos: number; checkin: number; medalha: number }> = {};
    provasDoEvento.forEach((p) => {
      mapa[p.id] = { inscritos: 0, checkin: 0, medalha: 0 };
    });
    inscricoes.forEach((i) => {
      if (i.eventoId !== eventoId || i.status !== "confirmada") return;
      const total = mapa[i.provaId];
      if (!total) return;
      total.inscritos += 1;
      const dorsal = obterDorsal(i.id);
      if (dorsal?.checkInFeito) total.checkin += 1;
      if (dorsal?.medalhaEntregue) total.medalha += 1;
    });
    return mapa;
  }, [inscricoes, provasDoEvento, eventoId, obterDorsal]);

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }
  function nomeTipoProva(id: string) {
    return tiposProva.find((t) => t.id === id)?.nome ?? "—";
  }

  function horaDe(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link
          href="/organizacao/eventos"
          className="mt-4 inline-block text-sm font-medium text-brand-green hover:underline"
        >
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/organizacao/eventos/${eventoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o evento
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Provas</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {evento.nome} — situação de realização e operação no dia.
        </p>
      </header>

      <AlertaPersistencia erro={erroProvas ?? erroTiposProva} />

      {provasDoEvento.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este evento ainda não tem provas cadastradas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {provasDoEvento.map((prova) => {
            const situacao = situacaoDaProva(prova);
            const totais = totaisPorProva[prova.id] ?? { inscritos: 0, checkin: 0, medalha: 0 };
            return (
              <div
                key={prova.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-green/50 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-brand-blue/10 p-2">
                      <ListChecks className="h-4 w-4 text-brand-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {nomeModalidade(prova.modalidadeId)} · {nomeCategoria(prova.categoriaId)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {nomeTipoProva(prova.tipoProvaId)}
                        {prova.horario ? ` · ${prova.horario}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SITUACAO_PROVA_CLASSE[situacao]}`}
                    >
                      {SITUACAO_PROVA_LABEL[situacao]}
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {situacao === "nao_iniciada" && (
                        <Button
                          className="px-3 py-1.5 text-xs"
                          onClick={() => definirSituacao(prova.id, "em_andamento", nomeOperador)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Iniciar prova
                        </Button>
                      )}
                      {situacao === "em_andamento" && (
                        <Button
                          variant="secondary"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => definirSituacao(prova.id, "encerrada", nomeOperador)}
                        >
                          <Flag className="h-3.5 w-3.5" />
                          Encerrar prova
                        </Button>
                      )}
                      {situacao === "encerrada" && (
                        <Button
                          variant="ghost"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => definirSituacao(prova.id, "em_andamento", nomeOperador)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reabrir
                        </Button>
                      )}
                    </div>
                    {prova.situacaoAlteradaPor && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        por {prova.situacaoAlteradaPor}
                        {prova.situacaoAlteradaEm ? ` · ${horaDe(prova.situacaoAlteradaEm)}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Users className="h-3.5 w-3.5 text-brand-blue" />
                    {totais.inscritos} inscrito{totais.inscritos === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <UserCheck className="h-3.5 w-3.5 text-brand-green" />
                    {totais.checkin}/{totais.inscritos} check-in
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Award className="h-3.5 w-3.5 text-amber-500" />
                    {totais.medalha}/{totais.inscritos} medalhas
                  </span>
                  <Link
                    href={`/organizacao/eventos/${eventoId}/resultados`}
                    className="ml-auto flex items-center gap-1.5 text-xs font-medium text-brand-green hover:underline"
                  >
                    <Timer className="h-3.5 w-3.5" />
                    Lançar resultados
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
