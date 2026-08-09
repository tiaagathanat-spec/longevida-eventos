"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, FileText, FileBarChart, Printer } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes, Inscricao } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { classificar } from "@/lib/mock/classificacao";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Módulo Relatórios.
//
// Gera listas e relatórios do evento a partir dos dados já existentes
// no sistema (Inscrições, Provas, Categorias, Resultados, Dorsais) —
// nenhuma tabela nova foi criada. É uma tela só de LEITURA: nenhum
// outro módulo é alterado ou escrito por aqui.

type TipoRelatorio =
  | "inscritos_geral"
  | "inscritos_categoria"
  | "inscritos_prova"
  | "checkin"
  | "kits"
  | "dorsais"
  | "classificacao_prova"
  | "resultado_geral";

const TIPO_LABEL: Record<TipoRelatorio, string> = {
  inscritos_geral: "Lista geral de inscritos",
  inscritos_categoria: "Lista por categoria",
  inscritos_prova: "Lista por prova",
  checkin: "Lista de check-in",
  kits: "Lista de entrega de kits",
  dorsais: "Dorsais para impressão",
  classificacao_prova: "Classificação por prova",
  resultado_geral: "Resultado geral",
};

const TIPOS_ORDENADOS: TipoRelatorio[] = [
  "inscritos_geral",
  "inscritos_categoria",
  "inscritos_prova",
  "checkin",
  "kits",
  "dorsais",
  "classificacao_prova",
  "resultado_geral",
];

// Tipos que precisam de um seletor secundário (categoria ou prova).
const PRECISA_CATEGORIA: TipoRelatorio[] = ["inscritos_categoria"];
const PRECISA_PROVA: TipoRelatorio[] = ["inscritos_prova", "classificacao_prova"];

type Linha = Record<string, string>;

export default function RelatoriosPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { categorias } = useCategorias();
  const { modalidades } = useModalidades();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao: obterResultado } = useResultados();
  const { obterPorInscricao: obterDorsal } = useDorsais();

  const evento = obterEvento(eventoId);
  const provasDoEvento = useMemo(
    () => provas.filter((p) => p.eventoId === eventoId),
    [provas, eventoId]
  );
  const categoriasDoEvento = useMemo(() => {
    const ids = new Set(provasDoEvento.map((p) => p.categoriaId));
    return categorias.filter((c) => ids.has(c.id));
  }, [provasDoEvento, categorias]);

  const [tipo, setTipo] = useState<TipoRelatorio>("inscritos_geral");
  const [categoriaId, setCategoriaId] = useState(categoriasDoEvento[0]?.id ?? "");
  const [provaId, setProvaId] = useState(provasDoEvento[0]?.id ?? "");

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }
  function nomeProva(id: string) {
    const p = provas.find((pv) => pv.id === id);
    if (!p) return "—";
    return `${nomeModalidade(p.modalidadeId)} · ${nomeCategoria(p.categoriaId)}`;
  }
  function peitoDe(inscricao: Inscricao) {
    return obterDorsal(inscricao.id)?.numero?.toString().padStart(3, "0")
      ?? inscricao.numeroPeito
      ?? "—";
  }

  const inscritosDoEvento = useMemo(
    () => inscricoes.filter((i) => i.eventoId === eventoId),
    [inscricoes, eventoId]
  );
  const confirmadosDoEvento = useMemo(
    () => inscritosDoEvento.filter((i) => i.status === "confirmada"),
    [inscritosDoEvento]
  );

  const { colunas, linhas } = useMemo((): { colunas: string[]; linhas: Linha[] } => {
    switch (tipo) {
      case "inscritos_geral": {
        return {
          colunas: ["Peito", "Nome", "Modalidade", "Categoria", "Status"],
          linhas: inscritosDoEvento.map((i) => {
            const prova = provas.find((p) => p.id === i.provaId);
            return {
              Peito: peitoDe(i),
              Nome: i.atletaNome,
              Modalidade: nomeModalidade(prova?.modalidadeId ?? ""),
              Categoria: nomeCategoria(prova?.categoriaId ?? ""),
              Status: i.status,
            };
          }),
        };
      }
      case "inscritos_categoria": {
        const linhasCategoria = inscritosDoEvento
          .filter((i) => {
            const prova = provas.find((p) => p.id === i.provaId);
            return prova?.categoriaId === categoriaId;
          })
          .map((i) => {
            const prova = provas.find((p) => p.id === i.provaId);
            return {
              Peito: peitoDe(i),
              Nome: i.atletaNome,
              Modalidade: nomeModalidade(prova?.modalidadeId ?? ""),
              Status: i.status,
            };
          });
        return { colunas: ["Peito", "Nome", "Modalidade", "Status"], linhas: linhasCategoria };
      }
      case "inscritos_prova": {
        const linhasProva = inscritosDoEvento
          .filter((i) => i.provaId === provaId)
          .map((i) => ({ Peito: peitoDe(i), Nome: i.atletaNome, Status: i.status }));
        return { colunas: ["Peito", "Nome", "Status"], linhas: linhasProva };
      }
      case "checkin": {
        return {
          colunas: ["Peito", "Nome", "Categoria", "Presente"],
          linhas: confirmadosDoEvento.map((i) => {
            const prova = provas.find((p) => p.id === i.provaId);
            return {
              Peito: peitoDe(i),
              Nome: i.atletaNome,
              Categoria: nomeCategoria(prova?.categoriaId ?? ""),
              Presente: "☐",
            };
          }),
        };
      }
      case "kits": {
        return {
          colunas: ["Peito", "Nome", "Categoria", "Kit entregue"],
          linhas: confirmadosDoEvento.map((i) => {
            const prova = provas.find((p) => p.id === i.provaId);
            return {
              Peito: peitoDe(i),
              Nome: i.atletaNome,
              Categoria: nomeCategoria(prova?.categoriaId ?? ""),
              "Kit entregue": "☐",
            };
          }),
        };
      }
      case "dorsais": {
        return {
          colunas: ["Peito", "Nome", "Categoria"],
          linhas: confirmadosDoEvento.map((i) => {
            const prova = provas.find((p) => p.id === i.provaId);
            return {
              Peito: peitoDe(i),
              Nome: i.atletaNome,
              Categoria: nomeCategoria(prova?.categoriaId ?? ""),
            };
          }),
        };
      }
      case "classificacao_prova": {
        const inscritos = inscritosDoEvento.filter(
          (i) => i.provaId === provaId && i.status === "confirmada"
        );
        const comTempo = inscritos
          .map((i) => ({ item: i, tempo: obterResultado(i.id)?.tempo ?? "" }))
          .filter((i) => i.tempo.trim() !== "");
        const ranking = classificar(comTempo);
        return {
          colunas: ["Colocação", "Peito", "Nome", "Tempo"],
          linhas: ranking.map(({ colocacao, item, segundos }) => ({
            Colocação: String(colocacao),
            Peito: peitoDe(item),
            Nome: item.atletaNome,
            Tempo: `${segundos.toFixed(2)}s`,
          })),
        };
      }
      case "resultado_geral": {
        const todasLinhas: Linha[] = [];
        provasDoEvento.forEach((prova) => {
          const inscritos = inscritosDoEvento.filter(
            (i) => i.provaId === prova.id && i.status === "confirmada"
          );
          const comTempo = inscritos
            .map((i) => ({ item: i, tempo: obterResultado(i.id)?.tempo ?? "" }))
            .filter((i) => i.tempo.trim() !== "");
          const ranking = classificar(comTempo);
          ranking.forEach(({ colocacao, item, segundos }) => {
            todasLinhas.push({
              Prova: nomeProva(prova.id),
              Colocação: String(colocacao),
              Peito: peitoDe(item),
              Nome: item.atletaNome,
              Tempo: `${segundos.toFixed(2)}s`,
            });
          });
        });
        return {
          colunas: ["Prova", "Colocação", "Peito", "Nome", "Tempo"],
          linhas: todasLinhas,
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, categoriaId, provaId, inscritosDoEvento, confirmadosDoEvento, provasDoEvento, provas]);

  async function exportarExcel() {
    const XLSX = await import("xlsx");
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, TIPO_LABEL[tipo].slice(0, 30));
    XLSX.writeFile(livro, `${tipo}-${evento?.nome ?? "evento"}.xlsx`);
  }

  async function exportarPDF() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();
    doc.setFontSize(13);
    doc.text(`${evento?.nome ?? ""} — ${TIPO_LABEL[tipo]}`, 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [colunas],
      body: linhas.map((linha) => colunas.map((c) => linha[c] ?? "")),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 166, 214] },
    });

    doc.save(`${tipo}-${evento?.nome ?? "evento"}.pdf`);
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link href="/admin/eventos" className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline">
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href={`/admin/eventos/${eventoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o evento
      </Link>

      <header className="mb-8 flex items-center gap-3">
        <div className="rounded-2xl bg-brand-blue/10 p-2.5">
          <FileBarChart className="h-6 w-6 text-brand-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Relatórios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Select
            id="tipo"
            label="Tipo de relatório"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoRelatorio)}
          >
            {TIPOS_ORDENADOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>

        {PRECISA_CATEGORIA.includes(tipo) && (
          <div className="w-full max-w-xs">
            <Select
              id="categoria"
              label="Categoria"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              {categoriasDoEvento.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
        )}

        {PRECISA_PROVA.includes(tipo) && (
          <div className="w-full max-w-xs">
            <Select
              id="prova"
              label="Prova"
              value={provaId}
              onChange={(e) => setProvaId(e.target.value)}
            >
              {provasDoEvento.map((p) => (
                <option key={p.id} value={p.id}>
                  {nomeProva(p.id)}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" onClick={exportarExcel} disabled={linhas.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button variant="ghost" onClick={exportarPDF} disabled={linhas.length === 0}>
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {tipo === "dorsais" && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-brand-blue/5 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
          <span>Para o crachá pronto com número grande e faixa colorida, use a impressão dedicada de dorsais.</span>
          <Link
            href={`/admin/eventos/${eventoId}/dorsais/imprimir`}
            className="inline-flex shrink-0 items-center gap-1.5 font-medium text-brand-blue hover:underline"
          >
            <Printer className="h-3.5 w-3.5" />
            Abrir
          </Link>
        </div>
      )}

      {linhas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum dado disponível para este relatório ainda.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {colunas.map((c) => (
                  <th key={c} className="px-4 py-3 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {linhas.map((linha, i) => (
                <tr key={i}>
                  {colunas.map((c) => (
                    <td key={c} className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
                      {linha[c]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
