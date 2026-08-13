"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  CalendarClock,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  Clock3,
  Lock,
  Download,
} from "lucide-react";
import {
  useEventos,
  EVENTO_STATUS_LABEL,
  EVENTO_STATUS_STYLE,
  inscricoesEstaoAbertas,
} from "@/lib/mock/eventos-store";
import { useContagemInscritosPublica } from "@/lib/mock/contagem-inscritos-publicos";
import { useGaleria } from "@/lib/mock/galeria-store";
import { useRegulamentos } from "@/lib/mock/regulamentos-store";

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function EventoPublicoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { inscritos } = useContagemInscritosPublica(eventoId);
  const { obterCapa, listarPublicasPorEvento } = useGaleria();
  const { listarPorEvento } = useRegulamentos();

  const evento = obterEvento(eventoId);

  if (!evento) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link
          href="/eventos"
          className="mt-4 inline-block text-sm font-medium text-brand-green hover:underline"
        >
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  const visivel = evento.status !== "rascunho";
  const abertas = inscricoesEstaoAbertas(evento, inscritos);
  const capa = obterCapa(evento.id);
  const fotos = listarPublicasPorEvento(evento.id).filter((f) => f.categoria !== "capa");
  const regulamentos = listarPorEvento(evento.id);

  if (!visivel) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          As informações deste evento ainda não foram publicadas.
        </p>
        <Link
          href="/eventos"
          className="mt-4 inline-block text-sm font-medium text-brand-green hover:underline"
        >
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {capa && (
        <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capa.url} alt={evento.nome} className="h-72 w-full object-cover" />
        </div>
      )}

      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${EVENTO_STATUS_STYLE[evento.status]}`}
          >
            {EVENTO_STATUS_LABEL[evento.status]}
          </span>
          {abertas ? (
            <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-medium text-brand-green">
              Inscrições abertas
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {evento.status === "em_espera" ? "Inscrições em breve" : "Inscrições encerradas"}
            </span>
          )}
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {evento.nome}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatarData(evento.data)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {evento.local}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {inscritos} inscritos
            {evento.vagas != null ? ` de ${evento.vagas} vagas` : ""}
          </span>
          {evento.dataLimiteInscricoes && (
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              Inscrições até {formatarData(evento.dataLimiteInscricoes)}
            </span>
          )}
        </div>
      </header>

      {evento.descricao && (
        <section className="mb-10">
          <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
            Sobre o evento
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {evento.descricao}
          </p>
        </section>
      )}

      {/* Inscrição */}
      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {evento.status === "em_espera"
                ? "As inscrições ainda não começaram"
                : abertas
                ? "Garanta sua vaga"
                : "Inscrições encerradas"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {evento.status === "em_espera"
                ? "Em breve será possível se inscrever no Portal do Atleta."
                : abertas
                ? `Faça a inscrição no Portal do Atleta.${
                    evento.vagas != null
                      ? ` Restam ${Math.max(evento.vagas - inscritos, 0)} vagas.`
                      : ""
                  }`
                : "As inscrições para este evento foram encerradas."}
            </p>
          </div>
          {abertas && (
            <Link
              href={`/portal/eventos/${evento.id}/inscricao`}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-95"
            >
              Inscrever-se
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {!abertas && (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
              {evento.status === "em_espera" ? (
                <>
                  <Clock3 className="h-4 w-4" />
                  Em breve
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Encerrada
                </>
              )}
            </span>
          )}
        </div>
      </section>

      {/* Regulamento */}
      {regulamentos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <FileText className="h-4 w-4 text-brand-blue" />
            Regulamento e documentos
          </h2>
          <div className="flex flex-col gap-2">
            {regulamentos.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                {...(doc.tipo === "pdf"
                  ? { download: doc.nome }
                  : { target: "_blank", rel: "noreferrer" })}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-green/50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <FileText className="h-4 w-4 text-brand-blue" />
                {doc.nome}
                <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                  {doc.tipo === "pdf" ? (
                    <>
                      PDF
                      <Download className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    "Imagem"
                  )}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Fotos publicadas */}
      {fotos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <ImageIcon className="h-4 w-4 text-brand-blue" />
            Fotos
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fotos.slice(0, 9).map((foto) => (
              <Link
                key={foto.id}
                href={`/galeria/${evento.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.url}
                  alt={foto.nome}
                  className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                />
              </Link>
            ))}
          </div>
          <Link
            href={`/galeria/${evento.id}`}
            className="mt-3 inline-block text-sm font-medium text-brand-green hover:underline"
          >
            Ver galeria completa
          </Link>
        </section>
      )}
    </div>
  );
}
