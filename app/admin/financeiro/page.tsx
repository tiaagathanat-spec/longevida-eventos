"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Pencil, Paperclip, CheckCircle2 } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import {
  usePagamentos,
  pagamentoEfetivo,
  FormaPagamento,
  StatusPagamento,
  FORMA_PAGAMENTO_LABEL,
  STATUS_PAGAMENTO_LABEL,
} from "@/lib/mock/pagamentos-store";
import { CardsResumo } from "@/components/financeiro/cards-resumo";
import { GraficosFinanceiro } from "@/components/financeiro/graficos";
import {
  EditarPagamentoModal,
  LinhaFinanceiroEdicao,
} from "@/components/financeiro/editar-pagamento-modal";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const STATUS_STYLE: Record<StatusPagamento, string> = {
  pago: "bg-brand-green/10 text-brand-green",
  pendente: "bg-amber-100 text-amber-600",
  cancelado: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function FinanceiroPage() {
  const { eventos } = useEventos();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes, atualizar: atualizarInscricao } = useInscricoes();
  const { obterPorInscricao, salvar } = usePagamentos();

  const [filtroEvento, setFiltroEvento] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroForma, setFiltroForma] = useState("todos");

  const [editando, setEditando] = useState<LinhaFinanceiroEdicao | null>(null);
  const [linhaComprovante, setLinhaComprovante] = useState<(typeof linhas)[number] | null>(null);

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

      return { inscricao, prova, evento, categoria, pagamento };
    });
  }, [inscricoes, provas, eventos, categorias, obterPorInscricao]);

  const linhasFiltradas = useMemo(() => {
    return linhas.filter(({ inscricao, categoria, pagamento }) => {
      if (filtroEvento !== "todos" && inscricao.eventoId !== filtroEvento) return false;
      if (filtroCategoria !== "todos" && categoria?.id !== filtroCategoria) return false;
      if (filtroStatus !== "todos" && pagamento.status !== filtroStatus) return false;
      if (filtroForma !== "todos" && pagamento.formaPagamento !== filtroForma) return false;
      return true;
    });
  }, [linhas, filtroEvento, filtroCategoria, filtroStatus, filtroForma]);

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
      receitaRecebida: pagas.reduce((soma, l) => soma + l.pagamento.valor, 0),
      receitaPendente: pendentes.reduce((soma, l) => soma + l.pagamento.valor, 0),
      // Kits a produzir = inscrições confirmadas (pagas ou não) do filtro.
      kitsAProduzir: linhasFiltradas.filter((l) => l.inscricao.status === "confirmada").length,
    };
  }, [linhasFiltradas]);

  // Gráficos usam a base completa (não filtrada), como visão geral fixa.
  const receitaPorEvento = useMemo(() => {
    return eventos.map((evento) => ({
      nome: evento.nome.length > 18 ? evento.nome.slice(0, 18) + "…" : evento.nome,
      receita: linhas
        .filter((l) => l.inscricao.eventoId === evento.id && l.pagamento.status === "pago")
        .reduce((soma, l) => soma + l.pagamento.valor, 0),
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
      atletaNome: linha.inscricao.atletaNome,
      numeroPeito: linha.inscricao.numeroPeito ?? "",
      valor: linha.pagamento.valor,
      formaPagamento: linha.pagamento.formaPagamento,
      status: linha.pagamento.status,
      dataPagamento: linha.pagamento.dataPagamento,
    });
  }

  function handleSalvarEdicao(dados: {
    numeroPeito: string;
    valor: number;
    formaPagamento: FormaPagamento | null;
    status: StatusPagamento;
    dataPagamento: string | null;
  }) {
    if (!editando) return;

    const pagamentoAtual = obterPorInscricao(editando.inscricaoId);

    salvar(editando.inscricaoId, {
      valor: dados.valor,
      formaPagamento: dados.formaPagamento,
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
      valor: linha.pagamento.valor,
      formaPagamento: "pix",
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
      Atleta: inscricao.atletaNome,
      Evento: evento?.nome ?? "",
      Categoria: categoria?.nome ?? "",
      Valor: pagamento.valor,
      "Forma de pagamento": pagamento.formaPagamento
        ? FORMA_PAGAMENTO_LABEL[pagamento.formaPagamento]
        : "",
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
      head: [["Peito", "Atleta", "Evento", "Categoria", "Valor", "Forma", "Status", "Data"]],
      body: linhasFiltradas.map(({ inscricao, evento, categoria, pagamento }) => [
        inscricao.numeroPeito ?? "",
        inscricao.atletaNome,
        evento?.nome ?? "",
        categoria?.nome ?? "",
        formatarMoeda(pagamento.valor),
        pagamento.formaPagamento ? FORMA_PAGAMENTO_LABEL[pagamento.formaPagamento] : "",
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

      <div className="mb-8">
        <CardsResumo {...totais} />
      </div>
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
          {(Object.keys(STATUS_PAGAMENTO_LABEL) as StatusPagamento[]).map((s) => (
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
      </div>

      {/* Tabela */}
      {linhasFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma inscrição encontrada com esses filtros.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Peito</th>
                <th className="px-4 py-3 font-medium">Atleta</th>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Forma</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Comprovante</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {linhasFiltradas.map((linha) => (
                <tr key={linha.inscricao.id}>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {linha.inscricao.numeroPeito || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {linha.inscricao.atletaNome}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {linha.evento?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {linha.categoria?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {formatarMoeda(linha.pagamento.valor)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {linha.pagamento.formaPagamento
                      ? FORMA_PAGAMENTO_LABEL[linha.pagamento.formaPagamento]
                      : "—"}
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
                        aria-label={`Ver comprovante de ${linha.inscricao.atletaNome}`}
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
                          aria-label={`Confirmar pagamento de ${linha.inscricao.atletaNome}`}
                          onClick={() => handleConfirmarComprovante(linha)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Confirmar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        aria-label={`Editar pagamento de ${linha.inscricao.atletaNome}`}
                        onClick={() => abrirEdicao(linha)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditarPagamentoModal
        linha={editando}
        onClose={() => setEditando(null)}
        onSalvar={handleSalvarEdicao}
      />

      <Modal
        open={!!linhaComprovante}
        title={linhaComprovante ? `Comprovante — ${linhaComprovante.inscricao.atletaNome}` : ""}
        onClose={() => setLinhaComprovante(null)}
      >
        {linhaComprovante && (
          <div className="flex flex-col gap-4">
            {linhaComprovante.pagamento.comprovanteUrl?.startsWith("data:image") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={linhaComprovante.pagamento.comprovanteUrl}
                alt="Comprovante de pagamento"
                className="max-h-80 w-full rounded-xl border border-slate-200 object-contain dark:border-slate-800"
              />
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
                <span className="text-slate-500 dark:text-slate-400">Forma</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {FORMA_PAGAMENTO_LABEL[linhaComprovante.pagamento.formaPagamento ?? "pix"]}
                </span>
              </div>
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
