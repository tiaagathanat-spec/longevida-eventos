"use client";

import Link from "next/link";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import {
  useEventos,
  EVENTO_STATUS_LABEL,
  inscricoesEstaoAbertas,
} from "@/lib/mock/eventos-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EventosDisponiveisPage() {
  const { eventos } = useEventos();
  const { inscricoes } = useInscricoes();

  // Rascunho fica oculto; os demais status aparecem conforme abertura.
  const publicados = eventos.filter((e) => e.status !== "rascunho");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Eventos disponíveis
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Inscreva seus atletas nos próximos eventos do Espaço Longevida.
        </p>
      </header>

      {publicados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum evento disponível para inscrição no momento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {publicados.map((evento) => {
            const inscritos = inscricoes.filter(
              (i) => i.eventoId === evento.id && i.status === "confirmada"
            ).length;
            const abertas = inscricoesEstaoAbertas(evento, inscritos);
            return (
              <div
                key={evento.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/portal/eventos/${evento.id}`}
                      className="text-sm font-medium text-slate-900 hover:underline dark:text-white"
                    >
                      {evento.nome}
                    </Link>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        abertas
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {abertas ? "Inscrições abertas" : EVENTO_STATUS_LABEL[evento.status]}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatarData(evento.data)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {evento.local}
                    </span>
                    <span className="text-slate-400">
                      {inscritos} inscritos
                      {evento.vagas != null ? ` de ${evento.vagas}` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/portal/eventos/${evento.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-brand-blue/40 hover:text-brand-blue dark:border-slate-800 dark:text-slate-300"
                  >
                    Detalhes
                  </Link>
                  {abertas ? (
                    <Link
                      href={`/portal/eventos/${evento.id}/inscricao`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-95"
                    >
                      Inscrever-se
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">
                      {evento.status === "em_espera" ? "Em breve" : "Encerrada"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
