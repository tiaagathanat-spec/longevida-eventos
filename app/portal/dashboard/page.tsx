"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, Trophy, ArrowRight } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useInscricoes, InscricaoStatus, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import { usePublicacoes } from "@/lib/mock/publicacoes-store";
import { useSessao } from "@/lib/mock/sessao";
import { usePerfis } from "@/lib/mock/perfis-store";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

const STATUS_LABEL: Record<InscricaoStatus, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const STATUS_STYLE: Record<InscricaoStatus, string> = {
  pendente: "bg-amber-100 text-amber-600",
  confirmada: "bg-brand-green/10 text-brand-green",
  cancelada: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AtletaDashboardPage() {
  const { sessao } = useSessao();
  const { obterPorEmail } = usePerfis();
  const { eventos } = useEventos();
  const { atletas } = useAtletas();
  const { categorias } = useCategorias();
  const { inscricoes, erro: erroInscricoes } = useInscricoes();
  const { publicacoes } = usePublicacoes();

  const fotoPerfil = obterPorEmail(sessao.email)?.foto;

  const meusAtletas = useMemo(
    () => atletas.filter((a) => a.responsavelNome === sessao.nome),
    [atletas, sessao.nome]
  );
  const meusNomesDeAtletas = useMemo(
    () => new Set(meusAtletas.map((a) => a.nome)),
    [meusAtletas]
  );

  const minhasInscricoes = useMemo(
    () => inscricoes.filter((i) => meusNomesDeAtletas.has(i.atletaNome)),
    [inscricoes, meusNomesDeAtletas]
  );

  // Rascunho fica oculto no portal; os demais status aparecem.
  const eventosPublicados = eventos.filter((e) => e.status !== "rascunho");

  const inscricoesAtivas = minhasInscricoes.filter((i) => i.status !== "cancelada").length;
  const meusResultadosPublicados = minhasInscricoes.filter(
    (i) => i.status === "confirmada" && publicacoes.some((p) => p.provaId === i.provaId)
  ).length;

  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "Sem categoria";
  }
  function nomeEvento(id: string) {
    return eventos.find((e) => e.id === id)?.nome ?? "—";
  }

  const KPIS = [
    { label: "Inscrições ativas", value: String(inscricoesAtivas), icon: ClipboardList },
    { label: "Eventos disponíveis", value: String(eventosPublicados.length), icon: CalendarDays },
    { label: "Resultados publicados", value: String(meusResultadosPublicados), icon: Trophy },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-brand-blue to-sky-600 p-6 text-white shadow-lg shadow-brand-blue/20">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-white">
          {fotoPerfil ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoPerfil}
              alt={sessao.nome}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-semibold">{sessao.nome.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">
            Olá, {sessao.nome}! 👋
          </h1>
          <p className="mt-1 text-sm text-white/85">
            Acompanhe suas inscrições, eventos disponíveis e resultados.
          </p>
        </div>
      </header>

      <AlertaPersistencia erro={erroInscricoes} />

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {KPIS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <div className="rounded-xl bg-brand-blue/10 p-2">
                <Icon className="h-4 w-4 text-brand-blue" strokeWidth={2} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </section>

      {/* Conteúdo principal */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Minhas inscrições */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Minhas inscrições
            </h2>
            <Link href="/portal/minhas-inscricoes" className="text-xs font-medium text-brand-blue hover:underline">
              Ver todas
            </Link>
          </div>

          {minhasInscricoes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma inscrição ainda.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {minhasInscricoes.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {nomeDaInscricao(item)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {nomeEvento(item.eventoId)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-xl bg-brand-blue/5 p-4">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Novos eventos abertos para inscrição
            </p>
            <Link
              href="/portal/eventos"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
            >
              Explorar eventos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Meus atletas + próximos eventos */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Meus atletas
              </h2>
              <Link href="/portal/meus-atletas" className="text-xs font-medium text-brand-blue hover:underline">
                Gerenciar
              </Link>
            </div>
            {meusAtletas.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum atleta vinculado.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {meusAtletas.map((atleta) => (
                  <div key={atleta.id} className="py-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {atleta.nome}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {nomeCategoria(atleta.categoriaId)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
              Próximos eventos
            </h2>
            {eventosPublicados.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum evento disponível.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {eventosPublicados.map((evento) => (
                  <div key={evento.id} className="py-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {evento.nome}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatarData(evento.data)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
