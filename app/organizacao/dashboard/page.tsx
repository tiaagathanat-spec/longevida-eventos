"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ListChecks,
  Timer,
  Trophy,
  Users,
  ClipboardList,
  Package,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { usePublicacoes } from "@/lib/mock/publicacoes-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import {
  useFuncionarios,
  MODULOS_ORGANIZACAO,
  PAPEL_ORGANIZACAO_LABEL,
  ModuloOrganizacao,
} from "@/lib/mock/funcionarios-store";

// Dashboard da Organização/Cronometragem.
//
// Dados reais dos stores mockados (Eventos, Provas, Inscrições,
// Resultados, Dorsais) — sem nada financeiro. Os cartões e listas
// respeitam as permissões do funcionário ativo: módulos sem acesso não
// aparecem (mesma regra da sidebar).

export default function OrganizacaoDashboardPage() {
  const { eventos } = useEventos();
  const { provas } = useProvas();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao: obterResultado } = useResultados();
  const { estaPublicado } = usePublicacoes();
  const { dorsais } = useDorsais();
  const { funcionarioAtivo } = useFuncionarios();

  const permissoes: ModuloOrganizacao[] =
    funcionarioAtivo?.permissoes ?? MODULOS_ORGANIZACAO.map((m) => m.chave);
  const pode = (modulo: ModuloOrganizacao) => permissoes.includes(modulo);

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  const estatisticas = useMemo(() => {
    const confirmadas = inscricoes.filter((i) => i.status === "confirmada");

    const ativosProximos = eventos.filter(
      (e) => e.status !== "rascunho" && e.status !== "encerrado"
    );

    // Resultados: provas com algum tempo lançado; separa aguardando
    // revisão (regra central 10) de publicadas.
    const provasComTempo = provas.filter((p) =>
      confirmadas.some((i) => i.provaId === p.id && !!obterResultado(i.id)?.tempo)
    );
    const aguardandoRevisao = provasComTempo.filter((p) => !estaPublicado(p.id));
    const resultadosPublicados = provasComTempo.filter((p) => estaPublicado(p.id));

    const checkins = dorsais.filter((d) => d.checkInFeito).length;
    const kitsEntregues = dorsais.filter((d) => d.kitEntregue).length;

    return {
      ativosProximos,
      confirmadas,
      provasComTempo,
      aguardandoRevisao,
      resultadosPublicados,
      checkins,
      kitsEntregues,
      totalInscritos: confirmadas.length,
    };
  }, [eventos, provas, inscricoes, dorsais, obterResultado, estaPublicado]);

  const provasProximas = useMemo(() => {
    return provas
      .filter((p) => {
        const evento = eventos.find((e) => e.id === p.eventoId);
        return (
          evento &&
          evento.status !== "encerrado" &&
          evento.status !== "rascunho" &&
          p.horario
        );
      })
      .map((p) => {
        const evento = eventos.find((e) => e.id === p.eventoId);
        const inscritosNaProva = inscricoes.filter(
          (i) => i.provaId === p.id && i.status === "confirmada"
        ).length;
        return {
          prova: p,
          evento,
          inscritosNaProva,
          comTempo: inscricoes.some(
            (i) => i.provaId === p.id && !!obterResultado(i.id)?.tempo
          ),
        };
      })
      .sort((a, b) => (a.prova.horario ?? "").localeCompare(b.prova.horario ?? ""))
      .slice(0, 6);
  }, [provas, eventos, inscricoes, obterResultado]);

  const KPIS = [
    {
      label: "Eventos ativos/próximos",
      value: String(estatisticas.ativosProximos.length),
      icon: CalendarDays,
      link: "/organizacao/eventos",
    },
    {
      label: "Atletas inscritos",
      value: String(estatisticas.totalInscritos),
      icon: Users,
      link: "/organizacao/eventos",
      alerta: false,
    },
    {
      label: "Check-ins realizados",
      value: String(estatisticas.checkins),
      icon: ClipboardList,
      link: "/organizacao/eventos",
    },
    {
      label: "Kits entregues",
      value: String(estatisticas.kitsEntregues),
      icon: Package,
      link: "/organizacao/eventos",
    },
  ];

  const KPIS_SECUNDARIOS = [
    {
      label: "Provas/baterias",
      value: String(provas.length),
      icon: ListChecks,
      link: "/organizacao/eventos",
    },
    {
      label: "Resultados p/ revisão",
      value: String(estatisticas.aguardandoRevisao.length),
      icon: Timer,
      link: "/organizacao/eventos",
      alerta: estatisticas.aguardandoRevisao.length > 0,
    },
    {
      label: "Resultados publicados",
      value: String(estatisticas.resultadosPublicados.length),
      icon: Trophy,
      link: "/organizacao/eventos",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-green to-lime-600 p-6 text-white shadow-lg shadow-brand-green/20">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-white/85">
          Provas e resultados dos eventos sob sua responsabilidade.
        </p>
        {funcionarioAtivo && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            Operando como {funcionarioAtivo.nome} ·{" "}
            {PAPEL_ORGANIZACAO_LABEL[funcionarioAtivo.papel]}
          </p>
        )}
      </header>

      {/* KPIs principais */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map(({ label, value, icon: Icon, link }) => (
          <Link
            key={label}
            href={link}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-green/50 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <div className="rounded-xl bg-brand-green/10 p-2">
                <Icon className="h-4 w-4 text-brand-green" strokeWidth={2} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
          </Link>
        ))}
      </section>

      {/* KPIs de resultados */}
      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {KPIS_SECUNDARIOS.map(({ label, value, icon: Icon, link, alerta }) => (
          <Link
            key={label}
            href={link}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-green/50 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <div
                className={`rounded-xl p-2 ${
                  alerta ? "bg-amber-100 text-amber-600" : "bg-violet-100 text-violet-600"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
          </Link>
        ))}
      </section>

      {estatisticas.aguardandoRevisao.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {estatisticas.aguardandoRevisao.length} prova(s) com tempos lançados aguardando
            aprovação antes de serem publicadas (revisão de resultados).
          </span>
        </div>
      )}

      {/* Conteúdo principal */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Eventos sob gestão */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Seus eventos</h2>
            <Link
              href="/organizacao/eventos"
              className="text-xs font-medium text-brand-green hover:underline"
            >
              Ver todos
            </Link>
          </div>

          {eventos.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum evento cadastrado ainda.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {eventos.map((evento) => {
                const inscritos = inscricoes.filter(
                  (i) => i.eventoId === evento.id && i.status === "confirmada"
                ).length;
                const provasDoEvento = provas.filter((p) => p.eventoId === evento.id);
                const comTempo = provasDoEvento.filter((p) =>
                  inscricoes.some(
                    (i) => i.provaId === p.id && i.status === "confirmada" && !!obterResultado(i.id)?.tempo
                  )
                ).length;
                return (
                  <Link
                    key={evento.id}
                    href={`/organizacao/eventos/${evento.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {evento.nome}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(evento.data + "T00:00:00").toLocaleDateString("pt-BR")} ·{" "}
                        {provasDoEvento.length} provas · {inscritos} inscritos
                        {comTempo > 0 ? ` · ${comTempo} com tempo` : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximas provas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Próximas provas
          </h2>

          {provasProximas.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma prova com horário definido.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {provasProximas.map(({ prova, evento, inscritosNaProva, comTempo }) => (
                <Link
                  key={prova.id}
                  href={
                    pode("provas")
                      ? `/organizacao/eventos/${prova.eventoId}/provas`
                      : `/organizacao/eventos/${prova.eventoId}`
                  }
                  className="py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {nomeModalidade(prova.modalidadeId)} · {nomeCategoria(prova.categoriaId)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-brand-green">
                      {prova.horario ?? "—"}
                    </span>
                    {evento?.nome}
                    {inscritosNaProva > 0 ? ` · ${inscritosNaProva} inscritos` : ""}
                  </p>
                  <span
                    className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      comTempo
                        ? "bg-brand-green/10 text-brand-green"
                        : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {comTempo ? "Tempo lançado" : "Aguardando tempos"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
