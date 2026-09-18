"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import {
  FileSpreadsheet,
  FileText,
  Pencil,
  Paperclip,
  CheckCircle2,
  Plus,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import {
  usePagamentos,
  pagamentoEfetivo,
  FORMA_PAGAMENTO_LABEL,
  STATUS_PAGAMENTO_LABEL,
  type FormaPagamento,
} from "@/lib/mock/pagamentos-store";
import { useCreditos } from "@/lib/mock/creditos-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import {
  formatarMoeda,
  legendaItens,
  porForma,
  totalCreditosItens,
  type ItemPagamento,
} from "@/lib/financeiro/pagamentos-utils";
import { diferencaDeUsoCredito } from "@/lib/financeiro/creditos-utils";
import { CardsResumo } from "@/components/financeiro/cards-resumo";
import { GraficosFinanceiro } from "@/components/financeiro/graficos";
import {
  EditarPagamentoModal,
  LinhaFinanceiroEdicao,
} from "@/components/financeiro/editar-pagamento-modal";
import { CreditosModal } from "@/components/financeiro/creditos-modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";
import { normalizarNomePessoa } from "@/lib/utils/nomes";

const ITENS_POR_PAGINA = 15;

const STATUS_STYLE: Record<string, string> = {
  pago: "bg-brand-green/10 text-brand-green",
  pendente: "bg-amber-100 text-amber-600",
  cancelado: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const COR_FORMA: Record<string, string> = {
  pix: "bg-brand-green/10 text-brand-green",
  dinheiro: "bg-brand-blue/10 text-brand-blue",
  cartao: "bg-purple-100 text-purple-600",
  cortesia: "bg-slate-200 text-slate-600",
  credito: "bg-amber-100 text-amber-600",
};

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

const EXTENSOES_IMAGEM = /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i;

// Comprovante como imagem: data URL legada (base64) ou URL pública do
// bucket `comprovantes` com extensão de imagem.
function exibirComprovanteComoImagem(url: string | undefined) {
  if (!url) return false;
  if (url.startsWith("data:image")) return true;
  return EXTENSOES_IMAGEM.test(url);
}

// Arquivo enviado ao Storage (PDF etc) — abre em nova aba.
function ehComprovanteDeArquivo(url: string | undefined) {
  return !!url && (url.startsWith("https://") || url.startsWith("/storage/"));
}

// Valor realmente recebido (PIX/dinheiro/cartão/cortesia). O crédito
// pré-existente NÃO entra como receita nova.
function receitaDasFormas(pagamento: { valor: number; itens?: ItemPagamento[] }) {
  const itens = pagamento.itens ?? [];
  if (itens.length === 0) return pagamento.valor;
  return itens
    .filter((i) => i.forma !== "credito")
    .reduce((soma, i) => soma + (Number(i.valor) || 0), 0);
}

export default function FinanceiroPage() {
  return (
    <Suspense fallback={null}>
      <FinanceiroConteudo />
    </Suspense>
  );
}

function FinanceiroConteudo() {
  const searchParams = useSearchParams();
  const { eventos } = useEventos();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes, atualizar: atualizarInscricao, erro: erroInscricoes } = useInscricoes();
  const { obterPorInscricao, salvar, erro: erroPagamentos } = usePagamentos();
  const creditos = useCreditos();

  const [filtroEvento, setFiltroEvento] = useState(
    () => searchParams.get("evento") ?? "todos"
  );
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroForma, setFiltroForma] = useState("todos");
  const [filtroAtleta, setFiltroAtleta] = useState("");
  const [filtroDorsal, setFiltroDorsal] = useState("");
  const [filtroPeriodoDe, setFiltroPeriodoDe] = useState("");
  const [filtroPeriodoAte, setFiltroPeriodoAte] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

  const [editando, setEditando] = useState<LinhaFinanceiroEdicao | null>(null);
  const [linhaComprovante, setLinhaComprovante] = useState<(typeof linhas)[number] | null>(null);
  const [creditosAberto, setCreditosAberto] = useState(false);
  const [erroCredito, setErroCredito] = useState<string | null>(null);

  const { obterPorInscricao: obterDorsalPorInscricao } = useDorsais();

  // Junta cada Inscrição com sua Prova (-> Evento/Categoria) e o
  // Pagamento efetivo (registro explícito ou derivado do status).
  const linhas = useMemo(() => {
    return inscricoes.map((inscricao) => {
      const prova = provas.find((p) => p.id === inscricao.provaId);
      const evento = eventos.find((e) => e.id === inscricao.eventoId);
      const categoria = categorias.find((c) => c.id === prova?.categoriaId);
      const pagamento = pagamentoEfetivo(
        inscricao,
        obterPorInscricao(inscricao.id),
        prova?.valor
      );
      const dorsal = obterDorsalPorInscricao(inscricao.id);

      return { inscricao, prova, evento, categoria, pagamento, dorsal };
    });
  }, [inscricoes, provas, eventos, categorias, obterPorInscricao, obterDorsalPorInscricao]);

  const linhasFiltradas = useMemo(() => {
    return linhas.filter(({ inscricao, categoria, pagamento, dorsal }) => {
      if (filtroEvento !== "todos" && inscricao.eventoId !== filtroEvento) return false;
      if (filtroCategoria !== "todos" && categoria?.id !== filtroCategoria) return false;
      if (filtroStatus !== "todos" && pagamento.status !== filtroStatus) return false;
      const itens = pagamento.itens ?? [];
      if (
        filtroForma !== "todos" &&
        !itens.some((i) => i.forma === filtroForma)
      ) {
        return false;
      }
      if (filtroAtleta) {
        const termo = filtroAtleta.toLowerCase();
        const nome = inscricao.atletaNome.toLowerCase();
        const nome2 = inscricao.atletaNome2?.toLowerCase() ?? "";
        const nome3 = inscricao.atletaNome3?.toLowerCase() ?? "";
        const nome4 = inscricao.atletaNome4?.toLowerCase() ?? "";
        if (
          !nome.includes(termo) &&
          !nome2.includes(termo) &&
          !nome3.includes(termo) &&
          !nome4.includes(termo)
        ) {
          return false;
        }
      }
      if (filtroDorsal) {
        const termo = filtroDorsal.toLowerCase();
        const numPeito = inscricao.numeroPeito?.toLowerCase() ?? "";
        const numDorsal = dorsal?.numero?.toString() ?? "";
        if (!numPeito.includes(termo) && !numDorsal.includes(termo)) return false;
      }
      if (filtroPeriodoDe || filtroPeriodoAte) {
        const data = pagamento.dataPagamento ?? inscricao.dataInscricao;
        if (data) {
          if (filtroPeriodoDe && data < filtroPeriodoDe) return false;
          if (filtroPeriodoAte && data > filtroPeriodoAte) return false;
        }
      }
      return true;
    });
  }, [linhas, filtroEvento, filtroCategoria, filtroStatus, filtroForma, filtroAtleta, filtroDorsal, filtroPeriodoDe, filtroPeriodoAte]);

  // Reseta para página 1 quando filtros mudam
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroEvento, filtroCategoria, filtroStatus, filtroForma, filtroAtleta, filtroDorsal, filtroPeriodoDe, filtroPeriodoAte]);

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(linhasFiltradas.length / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const linhasPaginadas = useMemo(() => {
    const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
    return linhasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [linhasFiltradas, paginaSegura]);

  // Cards refletem o conjunto filtrado, para o admin conseguir ver
  // totais de um evento/categoria específico quando quiser.
  const totais = useMemo(() => {
    const pagas = linhasFiltradas.filter((l) => l.pagamento.status === "pago");
    const pendentes = linhasFiltradas.filter((l) => l.pagamento.status === "pendente");
    const naoCanceladas = linhasFiltradas.filter((l) => l.pagamento.status !== "cancelado");

    return {
      totalInscritos: linhasFiltradas.length,
      totalPagas: pagas.length,
      totalPendentes: pendentes.length,
      receitaPrevista: naoCanceladas.reduce((soma, l) => soma + l.pagamento.valor, 0),
      // Crédito pré-existente não é receita nova — receita recebida é a
      // soma só das formas efetivas (PIX/dinheiro/cartão/cortesia).
      receitaRecebida: pagas.reduce((soma, l) => soma + receitaDasFormas(l.pagamento), 0),
      receitaPendente: pendentes.reduce((soma, l) => soma + l.pagamento.valor, 0),
      // Crédito utilizado aparece separado (não entra no caixa).
      creditoUtilizado: pagas.reduce(
        (soma, l) => soma + totalCreditosItens(l.pagamento.itens ?? []),
        0
      ),
      // Kits a produzir = inscrições confirmadas (pagas ou não) do filtro.
      kitsAProduzir: linhasFiltradas.filter((l) => l.inscricao.status === "confirmada").length,
    };
  }, [linhasFiltradas]);

  // Recebido por forma de pagamento (inclusive pagamentos divididos).
  const recebidoPorForma = useMemo(() => {
    const itens: ItemPagamento[] = [];
    for (const l of linhasFiltradas) {
      if (l.pagamento.status !== "pago") continue;
      for (const item of l.pagamento.itens ?? []) {
        itens.push(item);
      }
    }
    return porForma(itens);
  }, [linhasFiltradas]);

  // Gráficos usam a base completa (não filtrada), como visão geral fixa.
  const receitaPorEvento = useMemo(() => {
    return eventos.map((evento) => ({
      nome: evento.nome.length > 18 ? evento.nome.slice(0, 18) + "…" : evento.nome,
      receita: linhas
        .filter((l) => l.inscricao.eventoId === evento.id && l.pagamento.status === "pago")
        .reduce((soma, l) => soma + receitaDasFormas(l.pagamento), 0),
    }));
  }, [linhas, eventos]);

  const inscritosPorCategoria = useMemo(() => {
    return categorias.map((categoria) => ({
      nome: categoria.nome,
      quantidade: linhas.filter(
        (l) => l.categoria?.id === categoria.id && l.pagamento.status !== "cancelado"
      ).length,
    }));
  }, [linhas, categorias]);

  function abrirEdicao(linha: (typeof linhas)[number]) {
    setEditando({
      inscricaoId: linha.inscricao.id,
      atletaNome: normalizarNomePessoa(nomeDaInscricao(linha.inscricao)),
      numeroPeito: linha.inscricao.numeroPeito ?? "",
      valor: linha.pagamento.valor,
      itens: linha.pagamento.itens ?? [],
      formaPagamento: linha.pagamento.formaPagamento,
      status: linha.pagamento.status,
      dataPagamento: linha.pagamento.dataPagamento,
observacao: linha.pagamento.observacao ?? "",
      clienteId: linha.pagamento.clienteId ?? "",
      valorInscricao: linha.prova?.valor ?? linha.pagamento.valor ?? 0,
    });
  }

  function handleSalvarEdicao(dados: {
    numeroPeito: string;
    itens: ItemPagamento[];
    status: "pago" | "pendente" | "cancelado";
    dataPagamento: string | null;
    observacao: string;
    clienteId: string;
  }) {
    if (!editando) return;

    setErroCredito(null);
    const pagamentoAtual = obterPorInscricao(editando.inscricaoId);
    const clienteAntigo = pagamentoAtual?.clienteId?.trim() ?? "";
    const creditoAntigo =
      pagamentoAtual?.status === "pago"
        ? totalCreditosItens(pagamentoAtual.itens ?? [])
        : 0;
    const clienteNovo = dados.clienteId.trim();
    const creditoNovo =
      dados.status === "pago" ? totalCreditosItens(dados.itens) : 0;

    // Valida TODAS as operações de crédito ANTES de aplicar qualquer uma
    // (atomicidade): se alguma falhar, nada é alterado.
    if (clienteAntigo && clienteAntigo !== clienteNovo) {
      if (creditoNovo > 0) {
        const uso = creditos.utilizar(clienteNovo, creditoNovo, {
          inscricaoId: editando.inscricaoId,
          motivo: "Pagamento com crédito pré-existente (pré-validação)",
        });
        if (!uso.ok) {
          setErroCredito(uso.motivo ?? "Não foi possível usar o crédito do cliente.");
          return;
        }
        // Desfaz a utilização de pré-validação — será reaplicada abaixo
        if (uso.ok && uso.saldoApos != null) {
          creditos.estornar(clienteNovo, creditoNovo, {
            inscricaoId: editando.inscricaoId,
            motivo: "Estorno de pré-validação",
          });
        }
      }
      // Agora aplica as mudanças reais
      if (creditoAntigo > 0) {
        creditos.estornar(clienteAntigo, creditoAntigo, {
          inscricaoId: editando.inscricaoId,
          motivo: "Alteração do cliente no pagamento",
        });
      }
      if (creditoNovo > 0) {
        const uso = creditos.utilizar(clienteNovo, creditoNovo, {
          inscricaoId: editando.inscricaoId,
          motivo: "Pagamento com crédito pré-existente",
        });
        if (!uso.ok) {
          setErroCredito(uso.motivo ?? "Não foi possível usar o crédito do cliente.");
          return;
        }
      }
    } else if (clienteNovo) {
      const { utilizar, estornar } = diferencaDeUsoCredito(
        creditoAntigo,
        creditoNovo,
        dados.status
      );
      if (utilizar > 0) {
        const uso = creditos.utilizar(clienteNovo, utilizar, {
          inscricaoId: editando.inscricaoId,
          motivo: "Pagamento com crédito pré-existente (pré-validação)",
        });
        if (!uso.ok) {
          setErroCredito(uso.motivo ?? "Não foi possível usar o crédito do cliente.");
          return;
        }
        // Desfaz a utilização de pré-validação
        creditos.estornar(clienteNovo, utilizar, {
          inscricaoId: editando.inscricaoId,
          motivo: "Estorno de pré-validação",
        });
      }
      // Aplica as mudanças reais
      if (estornar > 0) {
        creditos.estornar(clienteNovo, estornar, {
          inscricaoId: editando.inscricaoId,
          motivo: "Estorno de crédito (edição/cancelamento do pagamento)",
        });
      }
      if (utilizar > 0) {
        const uso = creditos.utilizar(clienteNovo, utilizar, {
          inscricaoId: editando.inscricaoId,
          motivo: "Pagamento com crédito pré-existente",
        });
        if (!uso.ok) {
          setErroCredito(uso.motivo ?? "Não foi possível usar o crédito do cliente.");
          return;
        }
      }
    }

    salvar(editando.inscricaoId, {
      itens: dados.itens,
      observacao: dados.observacao,
      clienteId: dados.clienteId,
      status: dados.status,
      dataPagamento: dados.dataPagamento,
      comprovanteUrl: pagamentoAtual?.comprovanteUrl,
    });

    // Número de peito vive na Inscrição — atualiza só esse campo,
    // preservando o restante (inclusive o status da própria inscrição,
    // que é independente do status de pagamento).
    const inscricaoAtual = inscricoes.find((i) => i.id === editando.inscricaoId);
    if (inscricaoAtual) {
      atualizarInscricao(inscricaoAtual.id, {
        eventoId: inscricaoAtual.eventoId,
        provaId: inscricaoAtual.provaId,
        atletaNome: inscricaoAtual.atletaNome,
        status: inscricaoAtual.status,
        numeroPeito: dados.numeroPeito,
      });
    }

    setEditando(null);
  }

  // Confirma o pagamento com comprovante: marca como pago e confirma a
  // inscrição correspondente.
  function handleConfirmarComprovante(linha: (typeof linhas)[number]) {
    const hoje = new Date().toISOString().slice(0, 10);
    salvar(linha.inscricao.id, {
      itens: [{ forma: "pix", valor: linha.pagamento.valor }],
      observacao: linha.pagamento.observacao ?? "",
      clienteId: linha.pagamento.clienteId ?? "",
      status: "pago",
      dataPagamento: hoje,
      comprovanteUrl: linha.pagamento.comprovanteUrl,
    });
    atualizarInscricao(linha.inscricao.id, {
      eventoId: linha.inscricao.eventoId,
      provaId: linha.inscricao.provaId,
      atletaNome: linha.inscricao.atletaNome,
      status: "confirmada",
      numeroPeito: linha.inscricao.numeroPeito,
    });
    setLinhaComprovante(null);
  }

  async function handleExportarExcel() {
    const XLSX = await import("xlsx");
    const dados = linhasFiltradas.map(({ inscricao, evento, categoria, pagamento }) => ({
      "Nº de peito": inscricao.numeroPeito ?? "",
      Atleta: normalizarNomePessoa(inscricao.atletaNome),
      Evento: evento?.nome ?? "",
      Categoria: categoria?.nome ?? "",
      Valor: pagamento.valor,
      "Formas de pagamento": legendaItens(pagamento.itens ?? [], FORMA_PAGAMENTO_LABEL),
      "Observação": pagamento.observacao ?? "",
      Status: STATUS_PAGAMENTO_LABEL[pagamento.status],
      "Data do pagamento": pagamento.dataPagamento ?? "",
    }));

    const planilha = XLSX.utils.json_to_sheet(dados);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, "Financeiro");
    XLSX.writeFile(livro, "financeiro-longevida.xlsx");
  }

  async function handleExportarPDF() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Longevida Eventos — Financeiro", 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["Peito", "Atleta", "Evento", "Categoria", "Valor", "Formas", "Observação", "Status", "Data"]],
      body: linhasFiltradas.map(({ inscricao, evento, categoria, pagamento }) => [
        inscricao.numeroPeito ?? "",
        normalizarNomePessoa(inscricao.atletaNome),
        evento?.nome ?? "",
        categoria?.nome ?? "",
        formatarMoeda(pagamento.valor),
        legendaItens(pagamento.itens ?? [], FORMA_PAGAMENTO_LABEL),
        pagamento.observacao ?? "",
        STATUS_PAGAMENTO_LABEL[pagamento.status],
        formatarData(pagamento.dataPagamento),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 166, 214] },
    });

    doc.save("financeiro-longevida.pdf");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Financeiro</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Visão consolidada de inscrições e pagamentos de todos os eventos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setCreditosAberto(true)}>
            <Wallet className="h-4 w-4" />
            Créditos
          </Button>
          <Button variant="ghost" onClick={handleExportarExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button variant="ghost" onClick={handleExportarPDF}>
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </header>

      <AlertaPersistencia erro={erroInscricoes ?? erroPagamentos ?? creditos.erro} />

      {erroCredito && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {erroCredito}
        </div>
      )}

      <div className="mb-8">
        <CardsResumo {...totais} />
      </div>

      {/* Receita por forma de pagamento (inclusive pagamentos divididos) */}
      {recebidoPorForma.length > 0 && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Recebido por forma de pagamento
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Crédito pré-existente aparece separado e não entra como receita no caixa.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {recebidoPorForma.map((f) => (
              <span
                key={f.forma}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${COR_FORMA[f.forma]}`}
              >
                {FORMA_PAGAMENTO_LABEL[f.forma]}
                <span className="font-semibold">{formatarMoeda(f.valor)}</span>
                {f.forma === "credito" && (
                  <span className="text-[11px] font-normal opacity-70">(saldo de cliente)</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <GraficosFinanceiro
          receitaPorEvento={receitaPorEvento}
          inscritosPorCategoria={inscritosPorCategoria}
        />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={filtroEvento} onChange={(e) => setFiltroEvento(e.target.value)} className="w-auto">
          <option value="todos">Todos os eventos</option>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Select>

        <Select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="w-auto"
        >
          <option value="todos">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>

        <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-auto">
          <option value="todos">Todos os status</option>
          {(
            Object.keys(STATUS_PAGAMENTO_LABEL) as ("pago" | "pendente" | "cancelado")[]
          ).map((s) => (
            <option key={s} value={s}>
              {STATUS_PAGAMENTO_LABEL[s]}
            </option>
          ))}
        </Select>

        <Select value={filtroForma} onChange={(e) => setFiltroForma(e.target.value)} className="w-auto">
          <option value="todos">Todas as formas</option>
          {(Object.keys(FORMA_PAGAMENTO_LABEL) as FormaPagamento[]).map((f) => (
            <option key={f} value={f}>
              {FORMA_PAGAMENTO_LABEL[f]}
            </option>
          ))}
        </Select>

        <Input
          placeholder="Buscar atleta..."
          value={filtroAtleta}
          onChange={(e) => setFiltroAtleta(e.target.value)}
          className="w-48"
        />

        <Input
          placeholder="Dorsal / peito..."
          value={filtroDorsal}
          onChange={(e) => setFiltroDorsal(e.target.value)}
          className="w-36"
        />

        <Input
          type="date"
          label="Período de"
          value={filtroPeriodoDe}
          onChange={(e) => setFiltroPeriodoDe(e.target.value)}
          className="w-40"
        />

        <Input
          type="date"
          label="Período até"
          value={filtroPeriodoAte}
          onChange={(e) => setFiltroPeriodoAte(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Tabela */}
      {linhasFiltradas.length === 0 ? (
        linhas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhuma inscrição cadastrada ainda. O financeiro passa a ser preenchido
              conforme os atletas se inscrevem nos eventos.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/admin/eventos/novo"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark"
              >
                <Plus className="h-4 w-4" />
                Criar primeiro evento
              </Link>
              <Link
                href="/admin/eventos"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-brand-blue/40 dark:border-slate-800 dark:text-slate-300"
              >
                Ver eventos
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhuma inscrição encontrada com esses filtros.
            </p>
            <Button
              variant="ghost"
              className="mt-4 text-xs"
              onClick={() => {
                setFiltroEvento("todos");
                setFiltroCategoria("todos");
                setFiltroStatus("todos");
                setFiltroForma("todos");
                setFiltroAtleta("");
                setFiltroDorsal("");
                setFiltroPeriodoDe("");
                setFiltroPeriodoAte("");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Peito</th>
                  <th className="px-4 py-3 font-medium">Atleta</th>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Dorsal</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Formas</th>
                  <th className="px-4 py-3 font-medium">Observação</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Comprovante</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {linhasPaginadas.map((linha) => {
                  const formas = porForma(linha.pagamento.itens ?? []);
                  return (
                    <tr key={linha.inscricao.id}>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {linha.inscricao.numeroPeito || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {normalizarNomePessoa(nomeDaInscricao(linha.inscricao))}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {linha.evento?.nome ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {linha.categoria?.nome ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {linha.dorsal?.numero ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {formatarMoeda(linha.pagamento.valor)}
                      </td>
                      <td className="px-4 py-3">
                        {formas.length === 0 ? (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {formas.map((f) => (
                              <span
                                key={f.forma}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${COR_FORMA[f.forma]}`}
                              >
                                {FORMA_PAGAMENTO_LABEL[f.forma]} {formatarMoeda(f.valor)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-slate-500 dark:text-slate-400">
                        {linha.pagamento.observacao ? (
                          <span title={linha.pagamento.observacao} className="block truncate">
                            {linha.pagamento.observacao}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[linha.pagamento.status]}`}
                        >
                          {STATUS_PAGAMENTO_LABEL[linha.pagamento.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {linha.pagamento.comprovanteUrl ? (
                          <Button
                            variant="ghost"
                            aria-label={`Ver comprovante de ${nomeDaInscricao(linha.inscricao)}`}
                            onClick={() => setLinhaComprovante(linha)}
                          >
                            <Paperclip className="h-4 w-4 text-brand-blue" />
                            Ver
                          </Button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {formatarData(linha.pagamento.dataPagamento)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {linha.pagamento.status === "pendente" && linha.pagamento.comprovanteUrl && (
                            <Button
                              variant="ghost"
                              className="text-brand-green"
                              aria-label={`Confirmar pagamento de ${nomeDaInscricao(linha.inscricao)}`}
                              onClick={() => handleConfirmarComprovante(linha)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Confirmar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            aria-label={`Editar pagamento de ${nomeDaInscricao(linha.inscricao)}`}
                            onClick={() => abrirEdicao(linha)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                Mostrando {(paginaSegura - 1) * ITENS_POR_PAGINA + 1}–
                {Math.min(paginaSegura * ITENS_POR_PAGINA, linhasFiltradas.length)} de{" "}
                {linhasFiltradas.length} inscrições
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  disabled={paginaSegura <= 1}
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-xs">
                  Página {paginaSegura} de {totalPaginas}
                </span>
                <Button
                  variant="ghost"
                  disabled={paginaSegura >= totalPaginas}
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <EditarPagamentoModal
        linha={editando}
        valorInscricao={editando?.valorInscricao ?? 0}
        creditos={creditos}
        onClose={() => setEditando(null)}
        onSalvar={handleSalvarEdicao}
      />

      <CreditosModal open={creditosAberto} onClose={() => setCreditosAberto(false)} />

      <Modal
        open={!!linhaComprovante}
        title={linhaComprovante ? `Comprovante — ${nomeDaInscricao(linhaComprovante.inscricao)}` : ""}
        onClose={() => setLinhaComprovante(null)}
      >
        {linhaComprovante && (
          <div className="flex flex-col gap-4">
            {exibirComprovanteComoImagem(linhaComprovante.pagamento.comprovanteUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={linhaComprovante.pagamento.comprovanteUrl}
                alt="Comprovante de pagamento"
                className="max-h-80 w-full rounded-xl border border-slate-200 object-contain dark:border-slate-800"
              />
            ) : ehComprovanteDeArquivo(linhaComprovante.pagamento.comprovanteUrl) ? (
              <a
                href={linhaComprovante.pagamento.comprovanteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-blue/30 bg-brand-green/10 px-4 py-2.5 text-sm font-medium text-brand-green transition-colors hover:bg-brand-green/20"
              >
                <FileText className="h-4 w-4" />
                Abrir documento do comprovante
              </a>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                Documento anexado (PDF ou outro formato). O anexo foi recebido e pode ser
                conferido junto ao responsável.
              </div>
            )}

            <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Evento</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {linhaComprovante.evento?.nome ?? "—"}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Categoria</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {linhaComprovante.categoria?.nome ?? "—"}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Valor</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatarMoeda(linhaComprovante.pagamento.valor)}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Formas</span>
                <span className="text-right font-medium text-slate-900 dark:text-white">
                  {legendaItens(linhaComprovante.pagamento.itens ?? [], FORMA_PAGAMENTO_LABEL)}
                </span>
              </div>
              {linhaComprovante.pagamento.observacao && (
                <div className="mt-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Observação</span>
                  <span className="text-right font-medium text-slate-900 dark:text-white">
                    {linhaComprovante.pagamento.observacao}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setLinhaComprovante(null)}>
                Fechar
              </Button>
              {linhaComprovante.pagamento.status === "pendente" && (
                <Button type="button" onClick={() => handleConfirmarComprovante(linhaComprovante)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar pagamento e inscrição
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}