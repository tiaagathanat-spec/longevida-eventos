"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Eye, Pencil, Trash2, MapPin, CalendarDays, Users, CalendarClock } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

function formatarData(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EventosPage() {
  const { eventos, carregando, excluir, erro } = useEventos();
  const { inscricoes } = useInscricoes();
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const eventoParaExcluir = eventos.find((e) => e.id === excluindoId);

  const comContagem = useMemo(
    () =>
      eventos.map((evento) => {
        const inscritos = inscricoes.filter(
          (i) => i.eventoId === evento.id && i.status === "confirmada"
        ).length;
        return { evento, inscritos, abertas: inscricoesEstaoAbertas(evento, inscritos) };
      }),
    [eventos, inscricoes]
  );

  const filtrados = comContagem.filter(
    (l) => filtroStatus === "todos" || l.evento.status === filtroStatus
  );

  function vagaDescricao(linha: (typeof comContagem)[number]) {
    if (linha.evento.vagas == null) return `${linha.inscritos} inscritos`;
    return `${linha.inscritos} / ${linha.evento.vagas} inscritos`;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Eventos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Crie, edite e gerencie todos os eventos do Espaço Longevida.
          </p>
        </div>
        <Link href="/admin/eventos/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo evento
          </Button>
        </Link>
      </header>

      <AlertaPersistencia erro={erro} />

      <div className="mb-6">
        <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-auto">
          <option value="todos">Todos os status</option>
          {(Object.keys(EVENTO_STATUS_LABEL) as EventoStatus[]).map((s) => (
            <option key={s} value={s}>
              {EVENTO_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {carregando ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando eventos…</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum evento cadastrado ainda.
          </p>
          <Link href="/admin/eventos/novo" className="mt-4 inline-block">
            <Button>
              <Plus className="h-4 w-4" />
              Criar primeiro evento
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrados.map(({ evento, inscritos, abertas }) => (
            <div
              key={evento.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {evento.nome}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EVENTO_STATUS_STYLE[evento.status]}`}
                  >
                    {EVENTO_STATUS_LABEL[evento.status]}
                  </span>
                  {abertas && (
                    <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-medium text-brand-blue">
                      Inscrições abertas
                    </span>
                  )}
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
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {vagaDescricao({ evento, inscritos, abertas })}
                  </span>
                  {evento.dataLimiteInscricoes && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Limite: {formatarData(evento.dataLimiteInscricoes)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Link href={`/admin/eventos/${evento.id}`}>
                  <Button variant="ghost" aria-label={`Visualizar ${evento.nome}`}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/admin/eventos/${evento.id}/editar`}>
                  <Button variant="ghost" aria-label={`Editar ${evento.nome}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  aria-label={`Excluir ${evento.nome}`}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => setExcluindoId(evento.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!eventoParaExcluir}
        title="Excluir evento"
        description={
          eventoParaExcluir
            ? `Tem certeza que deseja excluir "${eventoParaExcluir.nome}"? Essa ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Excluir"
        onCancel={() => setExcluindoId(null)}
        onConfirm={() => {
          if (excluindoId) excluir(excluindoId).catch(() => {});
          setExcluindoId(null);
        }}
      />
    </div>
  );
}
