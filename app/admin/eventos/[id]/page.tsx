"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  CalendarDays,
  MapPin,
  Tag,
  Waves,
  Settings,
  ListChecks,
  Image as ImageIcon,
  Hash,
  Trophy,
  FileBarChart,
  FileText,
  Users,
  CalendarClock,
  Send,
  PlayCircle,
  Lock,
  CheckCircle2,
} from "lucide-react";
import {
  useEventos,
  EventoStatus,
  EVENTO_STATUS_LABEL,
  EVENTO_STATUS_STYLE,
  inscricoesEstaoAbertas,
} from "@/lib/mock/eventos-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const FLUXO: EventoStatus[] = [
  "rascunho",
  "em_espera",
  "inscricoes_abertas",
  "inscricoes_encerradas",
  "encerrado",
];

const FLUXO_ACAO: Partial<Record<EventoStatus, { label: string; proximo: EventoStatus }>> = {
  rascunho: { label: "Liberar informações", proximo: "em_espera" },
  em_espera: { label: "Liberar inscrições", proximo: "inscricoes_abertas" },
  inscricoes_abertas: { label: "Encerrar inscrições", proximo: "inscricoes_encerradas" },
  inscricoes_encerradas: { label: "Encerrar evento", proximo: "encerrado" },
};

function formatarData(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function VisualizarEventoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { obterPorId, excluir, alterarStatus, carregando } = useEventos();
  const { inscricoes } = useInscricoes();
  const evento = obterPorId(params.id);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [confirmandoFluxo, setConfirmandoFluxo] = useState<{
    status: EventoStatus;
    acao: string;
  } | null>(null);

  const inscritos = useMemo(
    () =>
      inscricoes.filter((i) => i.eventoId === params.id && i.status === "confirmada")
        .length,
    [inscricoes, params.id]
  );

  if (carregando) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando evento…</p>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link href="/admin/eventos" className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline">
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  const inscricoesAbertas = inscricoesEstaoAbertas(evento, inscritos);
  const acao = FLUXO_ACAO[evento.status];
  const posicaoFluxo = FLUXO.indexOf(evento.status);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/admin/eventos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Eventos
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                {evento.nome}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EVENTO_STATUS_STYLE[evento.status]}`}
              >
                {EVENTO_STATUS_LABEL[evento.status]}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 capitalize">
                <CalendarDays className="h-4 w-4" />
                {formatarData(evento.data)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {evento.local}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {inscritos} inscritos
                {evento.vagas != null ? ` de ${evento.vagas} vagas` : ""}
              </span>
              {evento.dataLimiteInscricoes && (
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" />
                  Limite de inscrições: {formatarData(evento.dataLimiteInscricoes)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Link href={`/admin/eventos/${evento.id}/editar`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
              onClick={() => setConfirmandoExclusao(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>

        {evento.descricao && (
          <p className="mt-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {evento.descricao}
          </p>
        )}
      </div>

      {/* Fluxo de liberação do evento */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Fluxo de liberação
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Controle quando as informações e as inscrições ficam visíveis aos atletas.
            </p>
          </div>
          {acao && (
            <Button
              onClick={() =>
                setConfirmandoFluxo({ status: acao.proximo, acao: acao.label })
              }
            >
              {evento.status === "rascunho" ? (
                <Send className="h-4 w-4" />
              ) : evento.status === "em_espera" ? (
                <PlayCircle className="h-4 w-4" />
              ) : evento.status === "inscricoes_abertas" ? (
                <Lock className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {acao.label}
            </Button>
          )}
        </div>

        <ol className="flex flex-wrap items-center gap-2">
          {FLUXO.map((passo, indice) => (
            <li key={passo} className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  indice < posicaoFluxo
                    ? "bg-brand-green/10 text-brand-green"
                    : indice === posicaoFluxo
                    ? "bg-brand-blue/10 text-brand-blue"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {indice < posicaoFluxo && <CheckCircle2 className="h-3.5 w-3.5" />}
                {EVENTO_STATUS_LABEL[passo]}
              </span>
              {indice < FLUXO.length - 1 && (
                <span className="text-slate-300 dark:text-slate-600">→</span>
              )}
            </li>
          ))}
        </ol>

        {evento.status === "em_espera" && (
          <p className="mt-3 text-xs text-sky-600 dark:text-sky-400">
            Informações liberadas para os atletas. As inscrições ainda estão fechadas.
          </p>
        )}
        {evento.status === "inscricoes_abertas" && (
          <p className="mt-3 text-xs text-brand-green">
            {inscricoesAbertas
              ? "Inscrições abertas no Portal do Atleta."
              : "Inscrições abertas no cadastro, mas já lotadas ou além da data limite."}
          </p>
        )}
        {evento.status === "inscricoes_encerradas" && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            Inscrições encerradas. As informações continuam visíveis aos atletas.
          </p>
        )}
      </div>

      {/* Atalhos para configuração do evento */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <Link
          href={`/admin/eventos/${evento.id}/provas`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <ListChecks className="h-4 w-4 text-brand-blue" />
          Provas
        </Link>
        <Link
          href={`/admin/eventos/${evento.id}/modalidades`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <Waves className="h-4 w-4 text-brand-blue" />
          Modalidades
        </Link>
        <Link
          href={`/admin/eventos/${evento.id}/categorias`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <Tag className="h-4 w-4 text-brand-blue" />
          Categorias
        </Link>
        <Link
          href={`/admin/eventos/${evento.id}/configuracoes`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <Settings className="h-4 w-4 text-brand-blue" />
          Configurações
        </Link>
        <Link
          href={`/admin/eventos/${evento.id}/galeria`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <ImageIcon className="h-4 w-4 text-brand-blue" />
          Galeria
        </Link>
        <Link
          href={`/admin/eventos/${evento.id}/regulamento`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <FileText className="h-4 w-4 text-brand-blue" />
          Regulamento
        </Link>
        <Link
          href={`/admin/eventos/${evento.id}/dorsais`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <Hash className="h-4 w-4 text-brand-blue" />
          Dorsais
        </Link>
        <Link
          href={`/admin/eventos/${evento.id}/classificacao-automatica`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <Trophy className="h-4 w-4 text-brand-blue" />
          Classificação
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href={`/admin/eventos/${evento.id}/relatorios`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <FileBarChart className="h-4 w-4 text-brand-blue" />
          Relatórios
        </Link>
        <Link
          href={`/admin/inscricoes`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <Users className="h-4 w-4 text-brand-blue" />
          Inscrições do evento
        </Link>
      </div>

      <ConfirmDialog
        open={confirmandoExclusao}
        title="Excluir evento"
        description={`Tem certeza que deseja excluir "${evento.nome}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onCancel={() => setConfirmandoExclusao(false)}
        onConfirm={async () => {
          try {
            await excluir(evento.id);
            setConfirmandoExclusao(false);
            router.push("/admin/eventos");
          } catch (err) {
            setConfirmandoExclusao(false);
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmandoFluxo}
        title={`${confirmandoFluxo?.acao}?`}
        description={
          confirmandoFluxo
            ? `O evento "${evento.nome}" passará para "${EVENTO_STATUS_LABEL[confirmandoFluxo.status]}". Deseja continuar?`
            : ""
        }
        confirmLabel="Confirmar"
        onCancel={() => setConfirmandoFluxo(null)}
        onConfirm={async () => {
          if (confirmandoFluxo) {
            await alterarStatus(evento.id, confirmandoFluxo.status);
          }
          setConfirmandoFluxo(null);
        }}
      />
    </div>
  );
}
