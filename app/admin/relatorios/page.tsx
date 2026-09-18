"use client";

// Relatórios Operacionais — módulo genérico do Admin.
//
// Gera relatórios de inscrições/atletas/equipes para QUALQUER evento e
// prova cadastrados, usando os dados REAIS persistidos no Supabase
// (fonte: /api/admin/relatorios/dados — leitura administration toda a
// organização). Suporta filtros (prova, categoria, modalidade, tipo de
// inscrição, situação de inscrição e pagamento), colunas dinâmicas por
// prova (duplas/equipes com função, percurso, distância e idade por
// participante), totalizações automáticas e exportação PDF/Excel/CSV +
// impressão em A4 paisagem.
//
// Sem regra fixa por evento/prova: o que cada participante executa vem
// da configuração de etapas da prova (app_prova_etapas) e, para provas
// individuais sem etapas, da Modalidade da prova.

import { useEffect, useMemo, useState } from "react";
import {
  FileBarChart,
  Printer,
  FileSpreadsheet,
  FileText,
  Download,
  RefreshCw,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  type DadosRelatorio,
  type FiltrosRelatorio,
  montarRelatorio,
  montarResumo,
  gerarCSV,
  ordenarLinhas,
  buscarLinhas,
  SITUACAO_INSCRICAO_LABEL,
  PAGAMENTO_LABEL,
  SEM_REGISTRO,
} from "@/lib/relatorios/modelo-relatorio";

type EstadoPagamentoFiltro =
  | "todas"
  | "pago"
  | "pendente"
  | "cancelado"
  | "sem_registro";

type Ordem = { coluna: string; direcao: "asc" | "desc" };

export default function RelatoriosPage() {
  const [dados, setDados] = useState<DadosRelatorio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [eventoId, setEventoId] = useState("");
  const [provaId, setProvaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [modalidadeId, setModalidadeId] = useState("");
  const [tipoInscricao, setTipoInscricao] =
    useState<FiltrosRelatorio["tipoInscricao"]>("todas");
  const [situacaoInscricao, setSituacaoInscricao] =
    useState<FiltrosRelatorio["situacaoInscricao"]>("todas");
  const [situacaoPagamento, setSituacaoPagamento] =
    useState<EstadoPagamentoFiltro>("todas");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>({ coluna: "Nº de peito", direcao: "asc" });

  async function carregarDados() {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/admin/relatorios/dados");
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(corpo.erro || `Erro ${resposta.status} ao buscar os dados.`);
      }
      const payload = await resposta.json();
      setDados(payload);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível carregar os dados.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  // Seleciona o primeiro evento automaticamente quando os dados chegam.
  useEffect(() => {
    if (!dados || eventoId) return;
    if (dados.eventos.length > 0) setEventoId(dados.eventos[0].id);
  }, [dados, eventoId]);

  const evento = dados?.eventos.find((e) => e.id === eventoId);

  const provasDoEvento = useMemo(
    () => dados?.provas.filter((p) => p.eventoId === eventoId) ?? [],
    [dados, eventoId]
  );

  const provasFiltro = provaId
    ? provasDoEvento.filter((p) => p.id === provaId)
    : provasDoEvento;

  const categoriasDoEvento = useMemo(
    () =>
      dados?.categorias.filter((c) =>
        provasFiltro.some((p) => p.categoriaId === c.id)
      ) ?? [],
    [dados, provasFiltro]
  );

  const modalidadesDoEvento = useMemo(
    () =>
      dados?.modalidades.filter((m) =>
        provasFiltro.some((p) => p.modalidadeId === m.id)
      ) ?? [],
    [dados, provasFiltro]
  );

  function aoTrocarEvento(id: string) {
    setEventoId(id);
    setProvaId("");
    setCategoriaId("");
    setModalidadeId("");
  }

  const filtros: FiltrosRelatorio = useMemo(
    () => ({
      eventoId,
      provaId: provaId || undefined,
      categoriaId: categoriaId || undefined,
      modalidadeId: modalidadeId || undefined,
      tipoInscricao,
      situacaoInscricao,
      situacaoPagamento,
    }),
    [eventoId, provaId, categoriaId, modalidadeId, tipoInscricao, situacaoInscricao, situacaoPagamento]
  );

  const montado = useMemo(
    () => (dados && eventoId ? montarRelatorio(dados, filtros) : null),
    [dados, eventoId, filtros]
  );

  const resumo = useMemo(
    () => (dados && montado ? montarResumo(dados, filtros, montado) : null),
    [dados, montado, filtros]
  );

  const colunas = montado?.colunas ?? [];

  // Linhas visíveis: ordenação por coluna + busca livre. Quando a coluna
  // ordenada deixa de existir (filtro mudou), volta para a primeira com ASC.
  const linhasVisiveis = useMemo(() => {
    if (!montado) return [];
    const colunaAlvo = colunas.includes(ordem.coluna)
      ? ordem.coluna
      : (colunas[0] ?? "");
    const ordenadas = ordenarLinhas(montado.linhas, colunaAlvo, ordem.direcao);
    return buscarLinhas(ordenadas, busca);
  }, [montado, colunas, ordem, busca]);

  const linhas = linhasVisiveis;

  function aoOrdenar(coluna: string) {
    setOrdem((atual) =>
      atual.coluna === coluna
        ? { coluna, direcao: atual.direcao === "asc" ? "desc" : "asc" }
        : { coluna, direcao: "asc" }
    );
  }

  // Descrição dos filtros ativos (usada no PDF e na impressão).
  const descricaoFiltros = () => {
    const partes: string[] = [];
    if (provaId) {
      const prova = provasDoEvento.find((p) => p.id === provaId);
      if (prova) {
        const modalidade = dados?.modalidades.find((m) => m.id === prova.modalidadeId);
        const categoria = dados?.categorias.find((c) => c.id === prova.categoriaId);
        partes.push(`Prova: ${modalidade?.nome ?? "—"} · ${categoria?.nome ?? "—"}`);
      }
    }
    if (categoriaId) {
      const categoria = dados?.categorias.find((c) => c.id === categoriaId);
      if (categoria) partes.push(`Categoria: ${categoria.nome}`);
    }
    if (modalidadeId) {
      const modalidade = dados?.modalidades.find((m) => m.id === modalidadeId);
      if (modalidade) partes.push(`Modalidade: ${modalidade.nome}`);
    }
    if (tipoInscricao !== "todas")
      partes.push(tipoInscricao === "equipe" ? "Tipo: equipes" : "Tipo: individual");
    if (situacaoInscricao && situacaoInscricao !== "todas") {
      partes.push(`Situação: ${SITUACAO_INSCRICAO_LABEL[situacaoInscricao] ?? situacaoInscricao}`);
    }
    if (situacaoPagamento !== "todas") {
      if (situacaoPagamento === "sem_registro") partes.push(`Pagamento: ${SEM_REGISTRO}`);
      else partes.push(`Pagamento: ${PAGAMENTO_LABEL[situacaoPagamento] ?? situacaoPagamento}`);
    }
    return partes.join(" · ");
  };

  // -------------------------------------------------------------------------
  // Exportações
  // -------------------------------------------------------------------------

  const nomeBase = () =>
    [evento?.nome ?? "evento", provaId ? "prova" : "todas-as-provas"]
      .join("-")
      .replace(/[^\wÀ-ú\- ]/g, "")
      .replace(/\s+/g, "-");

  function exportarCSV() {
    const conteudo = gerarCSV(colunas, linhas);
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${nomeBase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportarExcel() {
    const XLSX = await import("xlsx");
    const planilha = XLSX.utils.aoa_to_sheet([
      colunas,
      ...linhas.map((linha) => colunas.map((c) => linha[c] ?? "")),
    ]);
    const larguras = colunas.map((coluna) => {
      const maximo = linhas.reduce(
        (maior, linha) => Math.max(maior, (linha[coluna] ?? "").length),
        coluna.length
      );
      return { wch: Math.min(60, Math.max(10, maximo + 2)) };
    });
    planilha["!cols"] = larguras;
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, "Relatório");
    XLSX.writeFile(livro, `${nomeBase()}.xlsx`);
  }

  async function exportarPDF() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(12);
    doc.text(`${evento?.nome ?? ""} — Relatório de inscrições`, 14, 12);
    doc.setFontSize(8);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} · ${linhas.length} inscrição(ões).`,
      14,
      17
    );
    const filtros = descricaoFiltros();
    let startY = 21;
    if (filtros) {
      doc.text(filtros, 14, 21);
      startY = 26;
    }

    autoTable(doc, {
      startY,
      head: [colunas],
      body: linhas.map((linha) => colunas.map((c) => linha[c] ?? "")),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [0, 122, 163] },
      margin: { left: 14, right: 14 },
    });

    doc.save(`${nomeBase()}.pdf`);
  }

  // -------------------------------------------------------------------------

  if (carregando) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
        Carregando dados reais do relatório…
      </div>
    );
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">
            Não foi possível carregar os dados do relatório.
          </p>
          <p className="text-xs text-red-500/80">{erro}</p>
          <Button onClick={carregarDados}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!dados || dados.eventos.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        Nenhum evento cadastrado na sua organização ainda.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 print:max-w-none print:px-0">
      <header className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <div className="rounded-2xl bg-brand-blue/10 p-2.5">
          <FileBarChart className="h-6 w-6 text-brand-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Relatórios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Relatórios operacionais de inscrições, atletas e equipes (dados reais persistidos).
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={carregarDados} disabled={carregando}>
            <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button variant="secondary" onClick={exportarCSV} disabled={linhas.length === 0}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" onClick={exportarExcel} disabled={linhas.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="secondary" onClick={exportarPDF} disabled={linhas.length === 0}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button onClick={() => window.print()} disabled={linhas.length === 0}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <Select
          id="evento"
          label="Evento"
          value={eventoId}
          onChange={(e) => aoTrocarEvento(e.target.value)}
        >
          {dados.eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Select>

        <Select
          id="prova"
          label="Prova (todas)"
          value={provaId}
          onChange={(e) => {
            setProvaId(e.target.value);
            setCategoriaId("");
            setModalidadeId("");
          }}
        >
          <option value="">Todas as provas</option>
          {provasDoEvento.map((p) => {
            const modalidade = dados.modalidades.find((m) => m.id === p.modalidadeId);
            const categoria = dados.categorias.find((c) => c.id === p.categoriaId);
            return (
              <option key={p.id} value={p.id}>
                {modalidade?.nome ?? "—"} · {categoria?.nome ?? "—"}
              </option>
            );
          })}
        </Select>

        <Select
          id="categoria"
          label="Categoria (todas)"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categoriasDoEvento.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>

        <Select
          id="modalidade"
          label="Modalidade (todas)"
          value={modalidadeId}
          onChange={(e) => setModalidadeId(e.target.value)}
        >
          <option value="">Todas as modalidades</option>
          {modalidadesDoEvento.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </Select>

        <Select
          id="tipoInscricao"
          label="Tipo de inscrição"
          value={tipoInscricao ?? "todas"}
          onChange={(e) =>
            setTipoInscricao(e.target.value as FiltrosRelatorio["tipoInscricao"])
          }
        >
          <option value="todas">Individual e equipes</option>
          <option value="individual">Individual</option>
          <option value="equipe">Equipe/Dupla</option>
        </Select>

        <Select
          id="situacaoInscricao"
          label="Situação da inscrição"
          value={situacaoInscricao ?? "todas"}
          onChange={(e) =>
            setSituacaoInscricao(e.target.value as FiltrosRelatorio["situacaoInscricao"])
          }
        >
          <option value="todas">Todas</option>
          {Object.entries(SITUACAO_INSCRICAO_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Select>

        <Select
          id="situacaoPagamento"
          label="Pagamento"
          value={situacaoPagamento}
          onChange={(e) =>
            setSituacaoPagamento(e.target.value as EstadoPagamentoFiltro)
          }
        >
          <option value="todas">Todos</option>
          {Object.entries(PAGAMENTO_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
          <option value="sem_registro">{SEM_REGISTRO}</option>
        </Select>

        <div className="relative">
          <Input
            id="busca"
            label="Buscar"
            placeholder="Nome, peito, categoria…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <span className="pointer-events-none absolute right-3 top-9 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
        </div>
      </div>

      {linhas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 print:hidden">
          Nenhuma inscrição encontrada com os filtros ou a busca atuais.
        </div>
      ) : (
        <div id="print-area">
          <div className="mb-3 print:mb-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {evento?.nome}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evento em {evento?.data || "—"} ·{" "}
              {linhas.length === (montado?.linhas.length ?? 0)
                ? `${linhas.length} inscrição(ões)`
                : `${linhas.length} de ${montado?.linhas.length ?? 0} inscrição(ões)`}{" "}
              · {montado?.participantesTotal ?? 0} participante(s) · Gerado em{" "}
              {new Date().toLocaleString("pt-BR")}
            </p>
          </div>

          {resumo && (
            <div className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-4 print:mb-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-medium text-slate-500 dark:text-slate-400">Inscrições</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {resumo.inscricoes.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-medium text-slate-500 dark:text-slate-400">Participantes</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {resumo.participantes.toLocaleString("pt-BR")}
                </p>
              </div>
              {resumo.distancia.totalMetros != null && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-medium text-slate-500 dark:text-slate-400">Distância prevista</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {(resumo.distancia.totalMetros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
                    km
                  </p>
                </div>
              )}
              {resumo.distribuicao.pagamento.map(([rotulo, qtde]) => (
                <div key={rotulo} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-medium text-slate-500 dark:text-slate-400">Pagamento · {rotulo}</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {qtde.toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900">
                  {colunas.map((coluna) => {
                    const ativa = ordem.coluna === coluna;
                    return (
                      <th
                        key={coluna}
                        className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200"
                      >
                        <button
                          type="button"
                          onClick={() => aoOrdenar(coluna)}
                          className={`inline-flex items-center gap-1 text-left transition-colors ${
                            ativa ? "text-brand-blue dark:text-brand-green" : "hover:text-brand-blue"
                          }`}
                          title="Ordenar por esta coluna"
                        >
                          {coluna}
                          {ativa ? (
                            ordem.direcao === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5 print:hidden" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 print:hidden" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400 print:hidden" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, indice) => (
                  <tr
                    key={indice}
                    className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60 dark:border-slate-800 dark:odd:bg-slate-950 dark:even:bg-slate-900/40"
                  >
                    {colunas.map((coluna) => (
                      <td
                        key={coluna}
                        className="whitespace-nowrap px-3 py-2 align-top text-slate-700 dark:text-slate-300"
                      >
                        {linha[coluna] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resumo && (
            <div className="mt-6 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 print:mt-3">
              {[
                ["Por situação", resumo.distribuicao.situacao],
                ["Por categoria", resumo.distribuicao.categoria],
                ["Por modalidade", resumo.distribuicao.modalidade],
                ["Por tipo de inscrição", resumo.distribuicao.tipoInscricao],
                ["Por percurso/etapa", resumo.distribuicao.percurso],
                ["Por função", resumo.distribuicao.funcao],
              ].map(([titulo, pares]) => (
                <div
                  key={String(titulo)}
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <p className="mb-2 font-semibold text-slate-900 dark:text-white">
                    {String(titulo)}
                  </p>
                  {(pares as [string, number][]).length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400">—</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {(pares as [string, number][]).map(([rotulo, qtde]) => (
                        <li
                          key={rotulo}
                          className="flex items-center justify-between border-b border-slate-100 pb-1 last:border-0 dark:border-slate-800"
                        >
                          <span className="text-slate-600 dark:text-slate-300">{rotulo}</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {qtde.toLocaleString("pt-BR")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          #print-area {
            width: 100%;
          }
          #print-area table {
            font-size: 9px;
          }
          #print-area th,
          #print-area td {
            padding: 3px 4px !important;
          }
        }
      `}</style>
    </div>
  );
}