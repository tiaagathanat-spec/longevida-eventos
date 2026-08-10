"use client";

// Prévia do evento no Portal do Atleta (somente leitura).
//
// Mostra a mesma organização das telas de edição (capa, informações,
// provas, regulamento e fotos) para o atleta conhecer o evento — data da
// prova, horários, valores, vagas — e decidir se quer se inscrever, antes,
// durante ou depois da inscrição. Não há edição: apenas visualização e o
// botão de inscrição quando as inscrições estão abertas.

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  CalendarClock,
  FileText,
  Image as ImageIcon,
  Clock3,
  Lock,
  ArrowRight,
  Medal,
  Wallet,
} from "lucide-react";
import {
  useEventos,
  EVENTO_STATUS_LABEL,
  EVENTO_STATUS_STYLE,
  inscricoesEstaoAbertas,
} from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useGaleria } from "@/lib/mock/galeria-store";
import { useRegulamentos } from "@/lib/mock/regulamentos-store";
import { Button } from "@/components/ui/button";

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatarDataCurta(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PortalEventoDetalhePage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { obterCapa, listarPublicasPorEvento } = useGaleria();
  const { listarPorEvento } = useRegulamentos();

  const evento = obterEvento(eventoId);
  const provasDoEvento = useMemo(
    () => provas.filter((p) => p.eventoId === eventoId),
    [provas, eventoId]
  );

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link
          href="/portal/eventos"
          className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline"
        >
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  const inscritos = inscricoes.filter(
    (i) => i.eventoId === evento.id && i.status === "confirmada"
  ).length;
  const abertas = inscricoesEstaoAbertas(evento, inscritos);
  const capa = obterCapa(evento.id);
  const fotos = listarPublicasPorEvento(evento.id).filter((f) => f.categoria !== "capa");
  const regulamentos = listarPorEvento(evento.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/portal/eventos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Eventos
      </Link>

      {capa ? (
        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capa.url} alt={evento.nome} className="h-56 w-full object-cover sm:h-64" />
        </div>
      ) : null}

      <header className="mb-8">
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
          <span className="flex items-center gap-1.5 capitalize">
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
              Inscrições até {formatarDataCurta(evento.dataLimiteInscricoes)}
            </span>
          )}
        </div>
      </header>

      {evento.descricao ? (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
            Sobre o evento
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {evento.descricao}
          </p>
        </section>
      ) : null}

      {/* Inscrição */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
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
                ? `Faça a inscrição escolhendo o atleta e a prova.${
                    evento.vagas != null
                      ? ` Restam ${Math.max(evento.vagas - inscritos, 0)} vagas.`
                      : ""
                  }`
                : "As inscrições para este evento foram encerradas."}
            </p>
          </div>
          {abertas ? (
            <Link href={`/portal/eventos/${evento.id}/inscricao`}>
              <Button className="inline-flex items-center gap-2">
                Inscrever-se
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
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

      {/* Provas: modalidade · categoria, horário e valor */}
      {provasDoEvento.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Medal className="h-4 w-4 text-brand-blue" />
            Provas
          </h2>
          <div className="flex flex-col gap-2">
            {provasDoEvento.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {nomeModalidade(p.modalidadeId)} · {nomeCategoria(p.categoriaId)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {p.horario ? (
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        Horário: {p.horario}
                      </span>
                    ) : null}
                    {p.observacoes ? <span>{p.observacoes}</span> : null}
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  <Wallet className="h-4 w-4 text-brand-green" />
                  {formatarMoeda(p.valor)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Regulamento e documentos */}
      {regulamentos.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <FileText className="h-4 w-4 text-brand-blue" />
            Regulamento e documentos
          </h2>
          <div className="flex flex-col gap-2">
            {regulamentos.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-blue/50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <FileText className="h-4 w-4 text-brand-blue" />
                {doc.nome}
                <span className="ml-auto text-xs text-slate-400">
                  {doc.tipo === "pdf" ? "PDF" : "Imagem"}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Fotos publicadas */}
      {fotos.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <ImageIcon className="h-4 w-4 text-brand-blue" />
            Fotos
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fotos.slice(0, 9).map((foto) => (
              <a
                key={foto.id}
                href={foto.url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.url}
                  alt={foto.nome}
                  className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
