"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Award,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useTiposProva } from "@/lib/mock/tipos-prova-store";
import { useInscricoes, type Inscricao, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import { useQrCodes } from "@/lib/mock/qrcodes-store";
import { usePagamentos, FORMA_PAGAMENTO_LABEL, FormaPagamento } from "@/lib/mock/pagamentos-store";
import { normalizarNomePessoa } from "@/lib/utils/nomes";
import { determinarTipoInscricao } from "@/lib/inscricoes/computed";
import { calcularIdadeNaData } from "@/lib/idade";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";
import { CardsResumo } from "@/components/financeiro/cards-resumo";

type ColunaOrdenacao = "nome" | "numeroPeito" | "categoria" | "evento" | "dataInscricao" | "status";
type DirecaoOrdenacao = "asc" | "desc";

type Linha = {
  inscricao: Inscricao;
  evento: { nome: string; id: string };
  prova: { id: string; modalidadeId: string; categoriaId: string; tipoProvaId: string };
  categoria: { nome: string; id: string } | undefined;
  modalidade: { nome: string; id: string } | undefined;
  tipoInscricao: "individual" | "dupla" | "equipe";
  participantes: string[];
  dorsal: { numero: number | string } | undefined;
  qrCode: { identificador: string } | undefined;
  pagamento: { status: string; formaPagamento: FormaPagamento | null; valor: number; observacao?: string } | undefined;
  idadePrincipal: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};
const STATUS_STYLE: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-600",
  confirmada: "bg-brand-green/10 text-brand-green",
  cancelada: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const TIPO_INSCRICAO_LABEL: Record<string, string> = {
  individual: "Individual",
  dupla: "Dupla",
  equipe: "Equipe",
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function getFormaLabel(forma: FormaPagamento | null): string {
  if (!forma) return "—";
  return FORMA_PAGAMENTO_LABEL[forma] ?? forma;
}

export default function InscricoesPage() {
  const { eventos } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { atletas } = useAtletas();
  const { tiposProva } = useTiposProva();
  const { inscricoes, erro: erroInscricoes } = useInscricoes();
  const { qrCodes } = useQrCodes();
  const { obterPorInscricao } = usePagamentos();
  const searchParams = useSearchParams();

  const [filtros, setFiltros] = useState({
    evento: searchParams.get("evento") ?? "todos",
    prova: searchParams.get("prova") ?? "",
    categoria: searchParams.get("categoria") ?? "",
    modalidade: searchParams.get("modalidade") ?? "",
    tipoInscricao: "todas" as const,
    status: "todos" as const,
    pagamento: "todos" as const,
    dorsal: searchParams.get("dorsal") ?? "",
    busca: searchParams.get("busca") ?? "",
  });

  useEffect(() => {
    if (filtros.evento !== "todos" && filtros.prova) {
      const provaExiste = provas.some((p) => p.id === filtros.prova && p.eventoId === filtros.evento);
      if (!provaExiste) {
        setFiltros((f) => ({ ...f, prova: "" }));
      }
    }
  }, [filtros.evento, provas]);

  const [ordenarPor, setOrdenarPor] = useState<ColunaOrdenacao>("nome");
  const [direcao, setDirecao] = useState<DirecaoOrdenacao>("asc");
  const [modalAberto, setModalAberto] = useState(false);
  const [linhaSelecionada, setLinhaSelecionada] = useState<Linha | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 15;

  const linhas = useMemo(() => {
    return inscricoes
      .map((insc) => {
        const ev = eventos.find((e) => e.id === insc.eventoId);
        if (!ev) return null;
        const pr = provas.find((p) => p.id === insc.provaId);
        if (!pr) return null;
        const ca = categorias.find((c) => c.id === pr.categoriaId);
        const md = modalidades.find((m) => m.id === pr.modalidadeId);
        const tp = tiposProva.find((t) => t.id === pr.tipoProvaId);
        if (!ca || !md || !tp) return null;

        const tipoInsc = determinarTipoInscricao(tp);
        const atleta = atletas.find((a) => a.nome === insc.atletaNome);
        const idadePrincipal = atleta?.dataNascimento
          ? calcularIdadeNaData(atleta.dataNascimento, new Date().toISOString().slice(0, 10))
          : null;

        const qr = qrCodes.find((q) => q.inscricaoId === insc.id);
        const pagamento = obterPorInscricao(insc.id);

        const participantes = [insc.atletaNome, insc.atletaNome2, insc.atletaNome3, insc.atletaNome4]
          .filter((n): n is string => !!n?.trim())
          .map((nome) => normalizarNomePessoa(nome));

        return {
          inscricao: insc,
          evento: ev,
          prova: pr,
          categoria: ca ? { nome: ca.nome, id: ca.id } : undefined,
          modalidade: md ? { nome: md.nome, id: md.id } : undefined,
          tipoInscricao: tipoInsc,
          participantes,
          dorsal: insc.numeroPeito ? { numero: insc.numeroPeito } : undefined,
          qrCode: qr,
          pagamento,
          idadePrincipal,
        } as Linha;
      })
      .filter((linha): linha is Linha => linha !== null)
      .filter((linha) => {
        if (filtros.evento !== "todos" && linha.inscricao.eventoId !== filtros.evento) return false;
        if (filtros.prova && linha.prova.id !== filtros.prova) return false;
        if (filtros.categoria && linha.categoria?.id !== filtros.categoria) return false;
        if (filtros.modalidade && linha.modalidade?.id !== filtros.modalidade) return false;
        if (filtros.status !== "todos" && linha.inscricao.status !== filtros.status) return false;
        if (filtros.pagamento !== "todos") {
          const pgStatus = linha.pagamento?.status;
          if (filtros.pagamento === "confirmado" && pgStatus !== "pago") return false;
          if (filtros.pagamento === "pendente" && pgStatus !== "pendente") return false;
          if (filtros.pagamento === "cancelado" && pgStatus !== "cancelado") return false;
        }
        if (filtros.dorsal && (!linha.dorsal || String(linha.dorsal.numero) !== filtros.dorsal)) return false;
        if (filtros.tipoInscricao !== "todas" && linha.tipoInscricao !== filtros.tipoInscricao) return false;
        if (filtros.busca) {
          const termo = filtros.busca.toLowerCase();
          const nomeCompleto = nomeDaInscricao(linha.inscricao).toLowerCase();
          const atletaBusca = atletas.find((a) => a.nome.toLowerCase() === linha.inscricao.atletaNome.toLowerCase());
          const email = (atletaBusca?.email ?? "").toLowerCase();
          const telefone = (atletaBusca?.telefone ?? "").toLowerCase();
          if (!nomeCompleto.includes(termo) && !email.includes(termo) && !telefone.includes(termo) && !linha.inscricao.id.includes(termo)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (ordenarPor) {
          case "nome":
            cmp = nomeDaInscricao(a.inscricao).localeCompare(nomeDaInscricao(b.inscricao));
            break;
          case "numeroPeito":
            cmp = (Number(a.inscricao.numeroPeito) || 0) - (Number(b.inscricao.numeroPeito) || 0);
            break;
          case "categoria":
            cmp = (a.categoria?.nome ?? "").localeCompare(b.categoria?.nome ?? "");
            break;
          case "evento":
            cmp = a.evento.nome.localeCompare(b.evento.nome);
            break;
          case "dataInscricao":
            cmp = a.inscricao.dataInscricao.localeCompare(b.inscricao.dataInscricao);
            break;
          case "status":
            cmp = a.inscricao.status.localeCompare(b.inscricao.status);
            break;
        }
        return direcao === "asc" ? cmp : -cmp;
      });
  }, [inscricoes, eventos, provas, categorias, modalidades, tiposProva, atletas, qrCodes, filtros, ordenarPor, direcao, obterPorInscricao]);

  useEffect(() => { setPaginaAtual(1); }, [linhas.length]);

  const linhasPaginadas = linhas.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

  // Resumo
  const resumo = useMemo(() => {
    const total = linhas.length;
    const individuais = linhas.filter((l) => l.tipoInscricao === "individual").length;
    const duplas = linhas.filter((l) => l.tipoInscricao === "dupla").length;
    const equipes = linhas.filter((l) => l.tipoInscricao === "equipe").length;
    const confirmadas = linhas.filter((l) => l.inscricao.status === "confirmada").length;
    const pendentes = linhas.filter((l) => l.inscricao.status === "pendente").length;
    const canceladas = linhas.filter((l) => l.inscricao.status === "cancelada").length;
    const totalParticipantes = linhas.reduce((s, l) => s + l.participantes.length, 0);
    return { total, individuais, duplas, equipes, confirmadas, pendentes, canceladas, totalParticipantes };
  }, [linhas]);

  function toggleOrdenacao(coluna: ColunaOrdenacao) {
    if (ordenarPor === coluna) {
      setDirecao((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrdenarPor(coluna);
      setDirecao("asc");
    }
  }

  function renderIconOrdencao(coluna: ColunaOrdenacao) {
    if (ordenarPor !== coluna) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return direcao === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }

  function exportarCSV() {
    const headers = ["Peito", "Atleta", "Evento", "Categoria", "Modalidade", "Tipo", "Status", "Pagamento", "Data Inscrição"];
    const rows = linhas.map((l) => [
      String(l.dorsal?.numero ?? ""),
      normalizarNomePessoa(nomeDaInscricao(l.inscricao)),
      l.evento.nome,
      l.categoria?.nome ?? "",
      l.modalidade?.nome ?? "",
      TIPO_INSCRICAO_LABEL[l.tipoInscricao],
      STATUS_LABEL[l.inscricao.status],
      l.pagamento ? getFormaLabel(l.pagamento.formaPagamento) + (l.pagamento.status ? ` (${l.pagamento.status})` : "") : "",
      formatarData(l.inscricao.dataInscricao),
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inscricoes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportarPDF() {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("Longevida Eventos — Inscrições", 14, 16);
      autoTable(doc, {
        startY: 22,
        head: [["Peito", "Atleta", "Evento", "Categoria", "Tipo", "Status", "Data"]],
        body: linhas.map((l) => [
          String(l.dorsal?.numero ?? ""),
          normalizarNomePessoa(nomeDaInscricao(l.inscricao)),
          l.evento.nome,
          l.categoria?.nome ?? "",
          TIPO_INSCRICAO_LABEL[l.tipoInscricao],
          STATUS_LABEL[l.inscricao.status],
          formatarData(l.inscricao.dataInscricao),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 166, 214] },
      });
      doc.save("inscricoes-longevida.pdf");
    } catch {
      alert("Biblioteca jspdf não disponível. Use CSV export.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Inscrições</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Central de consulta e gestão das inscrições de todos os eventos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={exportarCSV}>
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </Button>
          <Button variant="ghost" onClick={exportarPDF}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </header>

      <AlertaPersistencia erro={erroInscricoes} />

      {/* Resumo */}
      <div className="mb-6">
        <CardsResumo
          totalInscritos={resumo.total}
          totalPagas={resumo.confirmadas}
          totalPendentes={resumo.pendentes}
          receitaPrevista={linhas.reduce((s, l) => s + (l.pagamento?.valor ?? 0), 0)}
          receitaRecebida={linhas.filter((l) => l.pagamento?.status === "pago").reduce((s, l) => s + (l.pagamento?.valor ?? 0), 0)}
          receitaPendente={linhas.filter((l) => l.pagamento?.status === "pendente").reduce((s, l) => s + (l.pagamento?.valor ?? 0), 0)}
          creditoUtilizado={0}
          kitsAProduzir={resumo.confirmadas}
        />
      </div>

      {/* Estatísticas extras */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Individuais", value: resumo.individuais },
          { label: "Duplas", value: resumo.duplas },
          { label: "Equipes", value: resumo.equipes },
          { label: "Total Participantes", value: resumo.totalParticipantes },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros e Busca */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <button
          type="button"
          onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
          className="flex w-full items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros e Busca
          </span>
          {filtrosExpandidos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {filtrosExpandidos && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={filtros.evento} onChange={(e) => setFiltros((f) => ({ ...f, evento: e.target.value }))}>
              <option value="todos">Todos os eventos</option>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </Select>

            <Select
              value={filtros.prova}
              onChange={(e) => setFiltros((f) => ({ ...f, prova: e.target.value }))}
              disabled={filtros.evento === "todos" || !filtros.evento}
            >
              <option value="">Todas as provas</option>
              {provas
                .filter((p) => filtros.evento === "todos" || p.eventoId === filtros.evento)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {modalidades.find((m) => m.id === p.modalidadeId)?.nome} · {categorias.find((c) => c.id === p.categoriaId)?.nome}
                  </option>
                ))}
            </Select>

            <Select value={filtros.categoria} onChange={(e) => setFiltros((f) => ({ ...f, categoria: e.target.value }))}>
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>

            <Select value={filtros.modalidade} onChange={(e) => setFiltros((f) => ({ ...f, modalidade: e.target.value }))}>
              <option value="">Todas as modalidades</option>
              {modalidades.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </Select>

            <Select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value as any }))}>
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
            </Select>

            <Select value={filtros.pagamento} onChange={(e) => setFiltros((f) => ({ ...f, pagamento: e.target.value as any }))}>
              <option value="todos">Todos os pagamentos</option>
              <option value="confirmado">Pagos</option>
              <option value="pendente">Pendentes</option>
              <option value="cancelado">Cancelados</option>
            </Select>

            <Select value={filtros.tipoInscricao} onChange={(e) => setFiltros((f) => ({ ...f, tipoInscricao: e.target.value as any }))}>
              <option value="todas">Todos os tipos</option>
              <option value="individual">Individual</option>
              <option value="dupla">Dupla</option>
              <option value="equipe">Equipe</option>
            </Select>

            <Input
              label="Número de peito/dorsal"
              placeholder="Ex: 15"
              value={filtros.dorsal}
              onChange={(e) => setFiltros((f) => ({ ...f, dorsal: e.target.value }))}
            />

            <div className="col-span-2">
              <Input
                id="busca"
                label="Busca rápida"
                placeholder="Nome, sobrenome, dorsal, e-mail, telefone, dupla, ID..."
                value={filtros.busca}
                onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
              />
            </div>

            <div className="col-span-3 flex justify-end">
              <Button variant="ghost" onClick={() => setFiltros({ evento: "todos", prova: "", categoria: "", modalidade: "", tipoInscricao: "todas", status: "todos", pagamento: "todos", dorsal: "", busca: "" })}>
                Limpar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      {linhas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {inscricoes.length === 0
              ? "Nenhuma inscrição cadastrada ainda."
              : "Nenhuma inscrição encontrada com esses filtros."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/admin/eventos/novo" className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark">
              <Plus className="h-4 w-4" /> Criar primeiro evento
            </Link>
            <Button variant="ghost" onClick={() => setFiltros({ evento: "todos", prova: "", categoria: "", modalidade: "", tipoInscricao: "todas", status: "todos", pagamento: "todos", dorsal: "", busca: "" })}>
              Limpar filtros
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {[
                    { col: "nome" as ColunaOrdenacao, label: "Atleta / Dupla" },
                    { col: "numeroPeito" as ColunaOrdenacao, label: "Peito" },
                    { col: "evento" as ColunaOrdenacao, label: "Evento" },
                    { col: "categoria" as ColunaOrdenacao, label: "Categoria" },
                    { col: "nome" as ColunaOrdenacao, label: "Tipo" },
                    { col: "status" as ColunaOrdenacao, label: "Status" },
                  ].map(({ col, label }) => (
                    <th key={col} className="px-4 py-3 font-medium cursor-pointer select-none" onClick={() => toggleOrdenacao(col)}>
                      <span className="flex items-center gap-1">{label} {renderIconOrdencao(col)}</span>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {linhasPaginadas.map((l) => (
                  <tr key={l.inscricao.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{normalizarNomePessoa(nomeDaInscricao(l.inscricao))}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{l.dorsal?.numero ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{l.evento.nome}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{l.categoria?.nome}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {TIPO_INSCRICAO_LABEL[l.tipoInscricao]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[l.inscricao.status]}`}>
                        {STATUS_LABEL[l.inscricao.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" onClick={() => { setLinhaSelecionada(l); setModalAberto(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Link href={`/admin/inscricoes/${l.inscricao.id}/editar`}>
                          <Button variant="ghost">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" className="text-red-500" onClick={() => setExcluindoId(l.inscricao.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {linhasPaginadas.map((l) => (
              <div key={l.inscricao.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{normalizarNomePessoa(nomeDaInscricao(l.inscricao))}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {l.evento.nome} · {l.categoria?.nome} · {TIPO_INSCRICAO_LABEL[l.tipoInscricao]}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-xs text-slate-500">Peito: {l.dorsal?.numero ?? "—"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[l.inscricao.status]}`}>
                        {STATUS_LABEL[l.inscricao.status]}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" onClick={() => { setLinhaSelecionada(l); setModalAberto(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Link href={`/admin/eventos/${l.inscricao.eventoId}/editar`}>
                      <Button variant="ghost">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" className="text-red-500" onClick={() => setExcluindoId(l.inscricao.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Paginação */}
      {linhas.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <span className="text-sm text-slate-500">
            Mostrando {(paginaAtual - 1) * ITENS_POR_PAGINA + 1}–{Math.min(paginaAtual * ITENS_POR_PAGINA, linhas.length)} de {linhas.length} inscrição(ões)
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" disabled={paginaAtual <= 1} onClick={() => setPaginaAtual((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="text-sm text-slate-700 dark:text-slate-300">Página {paginaAtual} de {Math.ceil(linhas.length / ITENS_POR_PAGINA)}</span>
            <Button variant="ghost" disabled={paginaAtual >= Math.ceil(linhas.length / ITENS_POR_PAGINA)} onClick={() => setPaginaAtual((p) => p + 1)}>
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {linhaSelecionada && (
        <Modal
          open={modalAberto}
          title={`Detalhes — ${normalizarNomePessoa(nomeDaInscricao(linhaSelecionada.inscricao))}`}
          onClose={() => setModalAberto(false)}
          tamanho="lg"
        >
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Evento</p>
                <p className="font-medium text-slate-900 dark:text-white">{linhaSelecionada.evento.nome}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Prova</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {modalidades.find((m) => m.id === linhaSelecionada.prova.modalidadeId)?.nome} · {linhaSelecionada.categoria?.nome}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Atleta(s)</p>
                <p className="font-medium text-slate-900 dark:text-white">{nomeDaInscricao(linhaSelecionada.inscricao)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tipo de inscrição</p>
                <p className="font-medium text-slate-900 dark:text-white">{TIPO_INSCRICAO_LABEL[linhaSelecionada.tipoInscricao]}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Dorsal</p>
                <p className="font-medium text-slate-900 dark:text-white">{linhaSelecionada.dorsal?.numero ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">QR Code</p>
                <p className="font-medium text-slate-900 dark:text-white">{linhaSelecionada.qrCode?.identificador ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Data da inscrição</p>
                <p className="font-medium text-slate-900 dark:text-white">{formatarData(linhaSelecionada.inscricao.dataInscricao)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[linhaSelecionada.inscricao.status]}`}>
                  {STATUS_LABEL[linhaSelecionada.inscricao.status]}
                </span>
              </div>
            </div>

            {/* Participantes */}
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="font-medium text-slate-900 dark:text-white">Participantes</p>
              <div className="mt-2 flex flex-col gap-1">
                {linhaSelecionada.participantes.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{p}</span>
                    <span className="text-xs text-slate-500">
                      {linhaSelecionada.idadePrincipal != null ? `${linhaSelecionada.idadePrincipal} anos` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagamento */}
            {linhaSelecionada.pagamento && (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="font-medium text-slate-900 dark:text-white">Pagamento</p>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Status:</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${linhaSelecionada.pagamento.status === "pago" ? "bg-brand-green/10 text-brand-green" : "bg-amber-100 text-amber-600"}`}>
                    {linhaSelecionada.pagamento.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">Forma: {getFormaLabel(linhaSelecionada.pagamento.formaPagamento)}</p>
                <p className="text-sm text-slate-500">Valor: {formatarMoeda(linhaSelecionada.pagamento.valor)}</p>
                {linhaSelecionada.pagamento.observacao && (
                  <p className="mt-1 text-sm text-slate-500">Observação: {linhaSelecionada.pagamento.observacao}</p>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={`/admin/inscricoes/${linhaSelecionada.inscricao.id}/qr`}>
                <Button variant="ghost">
                  <Eye className="h-4 w-4" /> Ver QR
                </Button>
              </Link>
              <Link href={`/admin/eventos/${linhaSelecionada.inscricao.eventoId}/dorsais/imprimir`}>
                <Button variant="ghost">
                  <Award className="h-4 w-4" /> Dorsal
                </Button>
              </Link>
              <Link href={`/admin/eventos/${linhaSelecionada.inscricao.eventoId}/financeiro`}>
                <Button variant="ghost">
                  <Calendar className="h-4 w-4" /> Pagamento
                </Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Excluir */}
      <ConfirmDialog
        open={!!excluindoId}
        title="Excluir inscrição"
        description={excluindoId ? `Tem certeza que deseja excluir a inscrição "${nomeDaInscricao(inscricoes.find((i) => i.id === excluindoId) ?? { atletaNome: "" })}"?` : undefined}
        confirmLabel="Excluir"
        onCancel={() => setExcluindoId(null)}
        onConfirm={() => {
          if (excluindoId) {
            setExcluindoId(null);
          }
        }}
      />
    </div>
  );
}