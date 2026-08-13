"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import {
  useEventos,
  EVENTO_STATUS_LABEL,
  EVENTO_STATUS_STYLE,
  inscricoesEstaoAbertas,
} from "@/lib/mock/eventos-store";
import { useContagensInscritosPublicas } from "@/lib/mock/contagem-inscritos-publicos";
import { useGaleria } from "@/lib/mock/galeria-store";

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EventosPublicosPage() {
  const { eventos } = useEventos();
  const { obterCapa } = useGaleria();

  // Rascunho fica oculto; os demais status aparecem para o público.
  const visiveis = useMemo(
    () => eventos.filter((e) => e.status !== "rascunho"),
    [eventos]
  );
  const eventoIds = useMemo(() => visiveis.map((e) => e.id), [visiveis]);
  const { contagens } = useContagensInscritosPublicas(eventoIds);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Eventos
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Confira os próximos eventos do Espaço Longevida.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-6">
        {visiveis.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum evento disponível no momento.
          </p>
        ) : (
          visiveis.map((evento) => {
            const inscritos = contagens[evento.id] ?? 0;
            const abertas = inscricoesEstaoAbertas(evento, inscritos);
            const capa = obterCapa(evento.id);
            return (
              <Link
                key={evento.id}
                href={`/eventos/${evento.id}`}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-green/50 dark:border-slate-800 dark:bg-slate-950"
              >
                {capa && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={capa.url}
                    alt=""
                    className="hidden h-16 w-24 shrink-0 rounded-xl object-cover sm:block"
                  />
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {evento.nome}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EVENTO_STATUS_STYLE[evento.status]}`}
                    >
                      {EVENTO_STATUS_LABEL[evento.status]}
                    </span>
                    {abertas && (
                      <span className="rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-medium text-brand-green">
                        Inscrições abertas
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatarData(evento.data)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {evento.local}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {inscritos} inscritos
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
