"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

const STATUS_STYLE: Record<string, string> = {
  rascunho: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  publicado: "bg-brand-green/10 text-brand-green",
  encerrado: "bg-brand-blue/10 text-brand-blue",
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  encerrado: "Encerrado",
};

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OrganizacaoEventosPage() {
  const { eventos, erro: erroEventos } = useEventos();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao } = useResultados();

  const resumo = useMemo(() => {
    return eventos.map((evento) => {
      const provasDoEvento = provas.filter((p) => p.eventoId === evento.id);
      const inscricoesDoEvento = inscricoes.filter(
        (i) => i.eventoId === evento.id && i.status === "confirmada"
      );
      const semTempo = inscricoesDoEvento.filter((i) => !obterPorInscricao(i.id)?.tempo);
      return { evento, provasDoEvento, inscricoesDoEvento, semTempo };
    });
  }, [eventos, provas, inscricoes, obterPorInscricao]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Eventos</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Selecione um evento para lançar resultados, conferir inscritos e organizar os kits.
        </p>
      </header>

      <AlertaPersistencia erro={erroEventos} />

      {resumo.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum evento cadastrado ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {resumo.map(({ evento, provasDoEvento, inscricoesDoEvento, semTempo }) => (
            <Link
              key={evento.id}
              href={`/organizacao/eventos/${evento.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-green/50 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      {evento.nome}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[evento.status]}`}
                    >
                      {STATUS_LABEL[evento.status] ?? evento.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatarData(evento.data)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {evento.local}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-brand-green" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {provasDoEvento.length} prova{provasDoEvento.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {inscricoesDoEvento.length} inscrito{inscricoesDoEvento.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-600">
                  {semTempo.length} sem tempo lançado
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
