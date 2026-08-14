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
  ExternalLink,
  Route,
  Video,
  Flag,
  Tag,
  Waves,
  Handshake,
} from "lucide-react";
import {
  useEventos,
  EVENTO_STATUS_LABEL,
  EVENTO_STATUS_STYLE,
  inscricoesEstaoAbertas,
  enderecoFormatado,
  enderecoParaMapa,
} from "@/lib/mock/eventos-store";
import { useContagemInscritosPublica } from "@/lib/mock/contagem-inscritos-publicos";
import { useGaleria } from "@/lib/mock/galeria-store";
import { useRegulamentos } from "@/lib/mock/regulamentos-store";
import {
  useProvas,
  SITUACAO_PROVA_LABEL,
  SITUACAO_PROVA_CLASSE,
  situacaoDaProva,
} from "@/lib/mock/provas-store";
import { useModalidades, type Modalidade } from "@/lib/mock/modalidades-store";
import { useCategorias, type Categoria } from "@/lib/mock/categorias-store";
import { useTiposProva } from "@/lib/mock/tipos-prova-store";
import {
  usePatrocinadores,
  COTA_LABEL,
} from "@/lib/mock/patrocinadores-store";
import { MapaGoogle, urlBuscaGoogleMaps } from "@/components/mapa/mapa-google";

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatarValor(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function faixaEtariaTexto(categoria: Categoria) {
  if (categoria.idadeMaxima == null) return `${categoria.idadeMinima}+ anos`;
  return `${categoria.idadeMinima} a ${categoria.idadeMaxima} anos`;
}

export default function EventoPublicoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { inscritos } = useContagemInscritosPublica(eventoId);
  const { obterCapa, listarPublicasPorEvento } = useGaleria();
  const { listarPorEvento } = useRegulamentos();
  const { listarPorEvento: listarProvasDoEvento } = useProvas();
  const { obterPorId: obterModalidade } = useModalidades();
  const { obterPorId: obterCategoria } = useCategorias();
  const { obterPorId: obterTipoProva } = useTiposProva();
  const { listarPorEvento: listarPatrocinadores } = usePatrocinadores();

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
  const midiasPublicas = listarPublicasPorEvento(evento.id);
  const percurso = midiasPublicas.filter((m) => m.categoria === "percurso");
  const fotos = midiasPublicas.filter(
    (f) => f.categoria !== "capa" && f.categoria !== "percurso" && f.tipo !== "video"
  );
  const regulamentos = listarPorEvento(evento.id);
  const provasDoEvento = listarProvasDoEvento(evento.id);
  const categoriasDoEvento: Categoria[] = [
    ...new Map(
      provasDoEvento
        .map((p) => obterCategoria(p.categoriaId))
        .filter((c): c is Categoria => c !== undefined)
        .map((c) => [c.id, c])
    ).values(),
  ];
  const modalidadesDoEvento: Modalidade[] = [
    ...new Map(
      provasDoEvento
        .map((p) => obterModalidade(p.modalidadeId))
        .filter((m): m is Modalidade => m !== undefined)
        .map((m) => [m.id, m])
    ).values(),
  ];
  const patrocinadores = listarPatrocinadores(evento.id);
  const endereco = enderecoFormatado(evento);
  const enderecoParaBusca = enderecoParaMapa(evento);

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

      {/* Localização */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <MapPin className="h-4 w-4 text-brand-blue" />
          Localização
        </h2>
        <div className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-medium text-slate-900 dark:text-white">{evento.local}</p>
          {endereco && <p className="mt-0.5">{endereco}</p>}
        </div>
        <MapaGoogle endereco={enderecoParaBusca} titulo={`Mapa — ${evento.nome}`} />
        <a
          href={urlBuscaGoogleMaps(enderecoParaBusca)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir no Google Maps
        </a>
      </section>

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

      {/* Provas */}
      {provasDoEvento.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Flag className="h-4 w-4 text-brand-blue" />
            Provas
          </h2>
          <div className="flex flex-col gap-3">
            {provasDoEvento.map((prova) => {
              const modalidade = obterModalidade(prova.modalidadeId);
              const categoria = obterCategoria(prova.categoriaId);
              const tipo = obterTipoProva(prova.tipoProvaId);
              const situacao = situacaoDaProva(prova);
              return (
                <div
                  key={prova.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {modalidade?.nome ?? "Prova"}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SITUACAO_PROVA_CLASSE[situacao]}`}
                      >
                        {SITUACAO_PROVA_LABEL[situacao]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {categoria?.nome ?? "Sem categoria"} · {tipo?.nome ?? "Prova"}
                    </p>
                  </div>
                  <div className="text-right">
                    {prova.horario && (
                      <p className="flex items-center justify-end gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />
                        {prova.horario}
                      </p>
                    )}
                    {typeof prova.valor === "number" && prova.valor > 0 && (
                      <p className="text-sm font-semibold text-brand-green">
                        {formatarValor(prova.valor)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Categorias */}
      {categoriasDoEvento.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Tag className="h-4 w-4 text-brand-blue" />
            Categorias
          </h2>
          <div className="flex flex-wrap gap-2">
            {categoriasDoEvento.map((categoria) => (
              <span
                key={categoria.id}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                {categoria.nome} · {faixaEtariaTexto(categoria)}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Modalidades */}
      {modalidadesDoEvento.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Waves className="h-4 w-4 text-brand-blue" />
            Modalidades
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {modalidadesDoEvento.map((modalidade) => (
              <div
                key={modalidade.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {modalidade.nome}
                  {modalidade.distanciaMetros != null && (
                    <span className="ml-2 rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-medium text-brand-blue">
                      {modalidade.distanciaMetros} m
                    </span>
                  )}
                </p>
                {modalidade.descricao && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {modalidade.descricao}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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

      {/* Percurso da prova */}
      {percurso.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Route className="h-4 w-4 text-brand-blue" />
            Percurso da prova
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {percurso.map((midia) =>
              midia.tipo === "video" ? (
                <div
                  key={midia.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
                >
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    src={midia.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full object-cover"
                  />
                  <p className="flex items-center gap-1.5 p-3 text-xs text-slate-500 dark:text-slate-400">
                    <Video className="h-3.5 w-3.5" />
                    {midia.nome}
                  </p>
                </div>
              ) : (
                <Link
                  key={midia.id}
                  href={`/galeria/${evento.id}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={midia.url}
                    alt={midia.nome}
                    className="h-40 w-full object-cover transition-transform group-hover:scale-105"
                  />
                </Link>
              )
            )}
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

      {/* Patrocinadores */}
      {patrocinadores.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Handshake className="h-4 w-4 text-brand-blue" />
            Patrocinadores e apoiadores
          </h2>
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
            {patrocinadores.map((patrocinador) => (
              <div
                key={patrocinador.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {patrocinador.nome}
                  </p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {COTA_LABEL[patrocinador.cota]}
                  </span>
                </div>
                {patrocinador.descricao && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {patrocinador.descricao}
                  </p>
                )}
                {patrocinador.siteUrl && (
                  <a
                    href={patrocinador.siteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-brand-green hover:underline"
                  >
                    Conhecer
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
