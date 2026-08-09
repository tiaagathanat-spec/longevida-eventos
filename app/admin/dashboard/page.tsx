"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Wallet,
  Users,
  Plus,
  Timer,
  Trophy,
  Globe,
  AlertTriangle,
  MapPin,
  Package,
  CheckCircle2,
  Clock3,
  ListChecks,
  UserCog,
  FileBarChart,
  Settings,
} from "lucide-react";
import { useEventos, inscricoesEstaoAbertas, diasParaDataLimite, EVENTO_STATUS_LABEL } from "@/lib/mock/eventos-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { usePublicacoes } from "@/lib/mock/publicacoes-store";
import { usePagamentos, pagamentoEfetivo, STATUS_PAGAMENTO_LABEL } from "@/lib/mock/pagamentos-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { Select } from "@/components/ui/select";

const PAGAMENTO_STYLE: Record<string, string> = {
  pago: "bg-brand-green/10 text-brand-green",
  pendente: "bg-amber-100 text-amber-600",
  cancelado: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminDashboardPage() {
  const { eventos } = useEventos();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { atletas } = useAtletas();
  const { obterPorInscricao: obterResultado } = useResultados();
  const { estaPublicado } = usePublicacoes();
  const { registros, obterPorInscricao: obterPagamento } = usePagamentos();
  const { dorsais } = useDorsais();

  const [filtroPagamentoStatus, setFiltroPagamentoStatus] = useState("todos");
  const [filtroPagamentoEvento, setFiltroPagamentoEvento] = useState("todos");

  const estatisticas = useMemo(() => {
    const confirmadas = inscricoes.filter((i) => i.status === "confirmada");

    const ativosProximos = eventos.filter(
      (e) => e.status !== "rascunho" && e.status !== "encerrado"
    );
    const encerrados = eventos.filter((e) => e.status === "encerrado");
    const rascunhos = eventos.filter((e) => e.status === "rascunho");

    const comInscricoes = eventos.map((e) => {
      const inscritos = confirmadas.filter((i) => i.eventoId === e.id).length;
      return { evento: e, inscritos, abertas: inscricoesEstaoAbertas(e, inscritos) };
    });

    const inscricoesAbertas = comInscricoes.filter((l) => l.abertas);
    const inscricoesEncerradas = comInscricoes.filter(
      (l) =>
        !l.abertas &&
        l.evento.status !== "rascunho" &&
        l.evento.status !== "encerrado" &&
        (l.evento.status === "inscricoes_encerradas" || l.evento.status === "em_espera" || l.evento.status === "inscricoes_abertas")
    );

    const pagamentos = inscricoes.map((i) => {
      const prova = provas.find((p) => p.id === i.provaId);
      return pagamentoEfetivo(i, obterPagamento(i.id), prova?.valor);
    });
    const pagamentosPendentes = pagamentos.filter((p) => p.status === "pendente");
    const pagamentosPagos = pagamentos.filter((p) => p.status === "pago");

    const vagasPreenchidas = comInscricoes
      .filter((l) => l.evento.vagas != null)
      .reduce((soma, l) => soma + Math.min(l.inscritos, l.evento.vagas as number), 0);
    const vagasTotais = comInscricoes
      .filter((l) => l.evento.vagas != null)
      .reduce((soma, l) => soma + (l.evento.vagas as number), 0);

    const checkins = dorsais.filter((d) => d.checkInFeito).length;

    const provasComTempo = provas.filter((p) => {
      const comTempo = inscricoes.some(
        (i) => i.provaId === p.id && i.status === "confirmada" && !!obterResultado(i.id)?.tempo
      );
      return comTempo;
    });
    const aguardandoRevisao = provasComTempo.filter((p) => !estaPublicado(p.id));
    const resultadosPublicados = provasComTempo.filter((p) => estaPublicado(p.id));

    return {
      ativosProximos,
      encerrados,
      rascunhos,
      comInscricoes,
      inscricoesAbertas,
      inscricoesEncerradas,
      totalInscritos: confirmadas.length,
      pagamentosPendentes,
      pagamentosPagos,
      receitaConfirmada: pagamentosPagos.reduce((s, p) => s + p.valor, 0),
      vagasPreenchidas,
      vagasTotais,
      checkins,
      aguardandoRevisao,
      resultadosPublicados,
    };
  }, [eventos, inscricoes, provas, dorsais, obterResultado, estaPublicado, obterPagamento]);

  const alertas = useMemo(() => {
    const itens: { texto: string; tipo: "info" | "atencao" | "perigo" }[] = [];

    estatisticas.comInscricoes
      .filter((l) => l.evento.status === "em_espera")
      .forEach((l) =>
        itens.push({
          texto: `"${l.evento.nome}" está em espera — libere as inscrições quando estiver pronto.`,
          tipo: "atencao",
        })
      );

    estatisticas.comInscricoes.forEach((l) => {
      const dias = diasParaDataLimite(l.evento);
      if (dias != null && dias >= 0 && dias <= 7 && l.evento.status === "inscricoes_abertas") {
        itens.push({
          texto: `Inscrições de "${l.evento.nome}" fecham em ${dias} dia${dias === 1 ? "" : "s"}.`,
          tipo: dias <= 3 ? "perigo" : "info",
        });
      }
      if (
        l.evento.vagas != null &&
        l.inscritos / l.evento.vagas >= 0.9 &&
        l.evento.status === "inscricoes_abertas"
      ) {
        itens.push({
          texto: `"${l.evento.nome}" está com ${l.evento.vagas - l.inscritos} vaga(s) restante(s).`,
          tipo: "atencao",
        });
      }
    });

    if (estatisticas.pagamentosPendentes.length > 0) {
      itens.push({
        texto: `${estatisticas.pagamentosPendentes.length} pagamento(s) pendente(s) aguardando confirmação.`,
        tipo: "atencao",
      });
    }

    if (estatisticas.aguardandoRevisao.length > 0) {
      itens.push({
        texto: `${estatisticas.aguardandoRevisao.length} prova(s) com tempos lançados aguardando revisão e publicação.`,
        tipo: "info",
      });
    }

    return itens;
  }, [estatisticas]);

  const linhasPagamento = useMemo(() => {
    return inscricoes
      .map((inscricao) => {
        const evento = eventos.find((e) => e.id === inscricao.eventoId);
        const prova = provas.find((p) => p.id === inscricao.provaId);
        return {
          inscricao,
          evento,
          pagamento: pagamentoEfetivo(inscricao, obterPagamento(inscricao.id), prova?.valor),
        };
      })
      .filter((l) =>
        filtroPagamentoStatus === "todos" || l.pagamento.status === filtroPagamentoStatus
      )
      .filter((l) =>
        filtroPagamentoEvento === "todos" || l.inscricao.eventoId === filtroPagamentoEvento
      )
      .slice(0, 8);
  }, [inscricoes, eventos, provas, filtroPagamentoStatus, filtroPagamentoEvento, obterPagamento]);

  const KPIS = [
    {
      label: "Eventos ativos/próximos",
      value: String(estatisticas.ativosProximos.length),
      icon: CalendarDays,
      link: "/admin/eventos",
    },
    {
      label: "Eventos encerrados",
      value: String(estatisticas.encerrados.length),
      icon: CheckCircle2,
      link: "/admin/eventos",
    },
    {
      label: "Inscrições abertas",
      value: String(estatisticas.inscricoesAbertas.length),
      icon: Globe,
      link: "/admin/inscricoes",
    },
    {
      label: "Inscrições encerradas",
      value: String(estatisticas.inscricoesEncerradas.length),
      icon: Clock3,
      link: "/admin/inscricoes",
    },
    {
      label: "Atletas inscritos",
      value: String(estatisticas.totalInscritos),
      icon: Users,
      link: "/admin/inscricoes",
    },
    {
      label: "Vagas",
      value:
        estatisticas.vagasTotais > 0
          ? `${estatisticas.vagasPreenchidas}/${estatisticas.vagasTotais}`
          : "Sem limite",
      icon: Package,
      link: "/admin/eventos",
    },
    {
      label: "Pagamentos pendentes",
      value: String(estatisticas.pagamentosPendentes.length),
      icon: Wallet,
      link: "/admin/financeiro",
      alerta: estatisticas.pagamentosPendentes.length > 0,
    },
    {
      label: "Pagamentos confirmados",
      value: String(estatisticas.pagamentosPagos.length),
      icon: CheckCircle2,
      link: "/admin/financeiro",
    },
    {
      label: "Provas/baterias",
      value: String(provas.length),
      icon: ListChecks,
      link: "/admin/eventos",
    },
    {
      label: "Check-ins realizados",
      value: String(estatisticas.checkins),
      icon: ClipboardList,
      link: "/organizacao/eventos",
    },
    {
      label: "Resultados p/ revisão",
      value: String(estatisticas.aguardandoRevisao.length),
      icon: Timer,
      link: "/admin/publicacao-resultados",
      alerta: estatisticas.aguardandoRevisao.length > 0,
    },
    {
      label: "Resultados publicados",
      value: String(estatisticas.resultadosPublicados.length),
      icon: Trophy,
      link: "/admin/publicacao-resultados",
    },
  ];

  const ATALHOS = [
    { label: "Criar evento", icon: Plus, href: "/admin/eventos/novo", cor: "bg-brand-blue/10 text-brand-blue" },
    { label: "Gerenciar inscrições", icon: ClipboardList, href: "/admin/inscricoes", cor: "bg-violet-100 text-violet-600" },
    { label: "Organizadores", icon: UserCog, href: "/admin/configuracoes/usuarios", cor: "bg-emerald-100 text-emerald-700" },
    { label: "Financeiro", icon: Wallet, href: "/admin/financeiro", cor: "bg-amber-100 text-amber-600" },
    { label: "Provas", icon: ListChecks, href: "/admin/eventos", cor: "bg-sky-100 text-sky-700" },
    { label: "Cronometragem", icon: Timer, href: "/organizacao/cronometragem", cor: "bg-orange-100 text-orange-700" },
    { label: "Revisar resultados", icon: Trophy, href: "/admin/publicacao-resultados", cor: "bg-brand-green/10 text-brand-green" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-blue to-sky-600 p-6 text-white shadow-lg shadow-brand-blue/20">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-white/85">
          Visão geral dos eventos, inscrições, pagamentos e resultados do Espaço Longevida.
        </p>
      </header>

      {/* Atalhos de ação */}
      <section className="mb-8 flex flex-wrap gap-3">
        {ATALHOS.map(({ label, icon: Icon, href, cor }) => (
          <Link
            key={label}
            href={href}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <span className={`rounded-lg p-1.5 ${cor}`}>
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            {label}
          </Link>
        ))}
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {KPIS.map(({ label, value, icon: Icon, link, alerta }) => (
          <Link
            key={label}
            href={link}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-blue/40 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <div
                className={`rounded-xl p-2 ${
                  alerta ? "bg-amber-100 text-amber-600" : "bg-brand-blue/10 text-brand-blue"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Alertas importantes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Alertas importantes
            </h2>
          </div>
          {alertas.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum alerta no momento.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {alertas.map((alerta, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2.5 text-xs ${
                    alerta.tipo === "perigo"
                      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      : alerta.tipo === "atencao"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                      : "bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300"
                  }`}
                >
                  {alerta.texto}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eventos com inscrições */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Situação das inscrições
            </h2>
            <Link href="/admin/eventos" className="text-xs font-medium text-brand-blue hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {estatisticas.comInscricoes.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum evento cadastrado ainda.
              </p>
            ) : (
              estatisticas.comInscricoes.map(({ evento, inscritos, abertas }) => (
                <div key={evento.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {evento.nome}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3 w-3" />
                      {inscritos} inscritos
                      {evento.vagas != null ? ` / ${evento.vagas} vagas` : ""}
                      {evento.dataLimiteInscricoes
                        ? ` · limite ${new Date(evento.dataLimiteInscricoes + "T00:00:00").toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      abertas
                        ? "bg-brand-green/10 text-brand-green"
                        : evento.status === "encerrado" || evento.status === "rascunho"
                        ? "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {abertas
                      ? "Inscrições abertas"
                      : evento.status === "encerrado"
                      ? "Encerrado"
                      : evento.status === "rascunho"
                      ? EVENTO_STATUS_LABEL[evento.status]
                      : "Inscrições encerradas"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Pagamentos com filtro */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Pagamentos</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Receita confirmada: {formatarMoeda(estatisticas.receitaConfirmada)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={filtroPagamentoEvento}
              onChange={(e) => setFiltroPagamentoEvento(e.target.value)}
              className="w-auto"
            >
              <option value="todos">Todos os eventos</option>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Select>
            <Select
              value={filtroPagamentoStatus}
              onChange={(e) => setFiltroPagamentoStatus(e.target.value)}
              className="w-auto"
            >
              <option value="todos">Todos os status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          </div>
        </div>

        {linhasPagamento.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhuma inscrição encontrada com esses filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-3 py-2.5 font-medium">Atleta</th>
                  <th className="px-3 py-2.5 font-medium">Evento</th>
                  <th className="px-3 py-2.5 font-medium">Valor</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {linhasPagamento.map(({ inscricao, evento, pagamento }) => (
                  <tr key={inscricao.id}>
                    <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                      {inscricao.atletaNome}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {evento?.nome ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {formatarMoeda(pagamento.valor)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PAGAMENTO_STYLE[pagamento.status]}`}
                      >
                        {STATUS_PAGAMENTO_LABEL[pagamento.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
