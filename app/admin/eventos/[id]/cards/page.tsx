"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Printer } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useProvas, identificacaoDaProva } from "@/lib/mock/provas-store";
import { useTiposProva } from "@/lib/mock/tipos-prova-store";
import { useEtapasProva } from "@/lib/mock/etapas-prova-store";
import { useInscricoes, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { usePerfis } from "@/lib/mock/perfis-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import {
  useFaixasNumeracao,
  resolverGrupoNumeracao,
  type CorFaixa,
} from "@/lib/mock/faixas-numeracao-store";
import { useQrDaInscricao } from "@/lib/mock/qrcodes-store";
import { agruparEmFolhas } from "@/lib/impressao/agrupar-em-folhas";
import { montarParticipacao, type DadosParticipacao } from "@/lib/dorsais/dados-participacao";
import type { Inscricao } from "@/lib/mock/inscricoes-store";
import type { Categoria } from "@/lib/mock/categorias-store";
import type { Atleta } from "@/lib/mock/atletas-store";
import { Button } from "@/components/ui/button";
import { CrachaAtleta } from "@/components/cracha/cracha-atleta";

type ItemCard = {
  inscricao: Inscricao;
  categoria: Categoria;
  atleta: Atleta;
  cor: CorFaixa;
  categoriaNome: string;
  foto?: string;
  participacao: DadosParticipacao;
};

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Envolve o CrachaAtleta para buscar o QR da inscrição via hook
// (hooks não podem ser chamados dentro de um .map()).
function CrachaComQr({
  inscricaoId,
  ...props
}: ComponentProps<typeof CrachaAtleta> & { inscricaoId: string }) {
  const qr = useQrDaInscricao(inscricaoId);
  return (
    <CrachaAtleta
      {...props}
      identificador={qr?.identificador}
      qrcodeConteudo={qr?.identificador}
    />
  );
}

export default function CardsDoEventoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { categorias } = useCategorias();
  const { modalidades } = useModalidades();
  const { provas } = useProvas();
  const { tiposProva } = useTiposProva();
  const { listarPorProva: listarEtapasDaProva } = useEtapasProva();
  const { inscricoes } = useInscricoes();
  const { atletas } = useAtletas();
  const { obterPorInscricao: obterDorsal } = useDorsais();
  const { obterPorEmail } = usePerfis();
  const { obterCriterio, obter: obterFaixa } = useFaixasNumeracao();

  const evento = obterEvento(eventoId);

  const cards = useMemo(() => {
    const itens: ItemCard[] = [];
    for (const inscricao of inscricoes) {
      if (inscricao.eventoId !== eventoId || inscricao.status !== "confirmada") continue;
      const prova = provas.find((p) => p.id === inscricao.provaId);
      if (!prova || identificacaoDaProva(prova) !== "card") continue;
      const categoria = categorias.find((c) => c.id === prova.categoriaId);
      const atleta = atletas.find((a) => a.nome === inscricao.atletaNome);
      if (!categoria || !atleta) continue;
      const fotos = obterPorEmail(atleta.email)?.foto;
      const modalidade = modalidades.find((m) => m.id === prova.modalidadeId);
      const tipoProva = tiposProva.find((t) => t.id === prova.tipoProvaId);
      const dorsal = obterDorsal(inscricao.id);
      // A cor e o rótulo da categoria vêm da MESMA fonte das faixas e dos
      // dorsais (faixas-numeracao-store), para o card e o dorsal terem a
      // mesma cor de categoria.
      const grupo = resolverGrupoNumeracao(
        obterCriterio(eventoId),
        categoria,
        atleta
      );
      itens.push({
        inscricao,
        categoria,
        atleta,
        cor: obterFaixa(eventoId, grupo.grupoId)?.cor ?? "azul",
        categoriaNome: grupo.grupoNome,
        foto: fotos,
        participacao: montarParticipacao({
          inscricao,
          prova,
          modalidade,
          categoria,
          tipoProva,
          dorsal,
          etapas: listarEtapasDaProva(inscricao.provaId),
        }),
      });
    }
    return itens.sort((a, b) => a.inscricao.atletaNome.localeCompare(b.inscricao.atletaNome));
  }, [inscricoes, provas, categorias, modalidades, tiposProva, atletas, eventoId, obterPorEmail, obterDorsal, obterCriterio, obterFaixa, listarEtapasDaProva]);

  // Seleção dos cards que serão impressos (padrão: todos, assim que os
  // dados carregam; o usuário pode desmarcar quais não quer imprimir).
  const todasIds = useMemo(() => cards.map((c) => c.inscricao.id), [cards]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(() => new Set());
  const usuarioMexeu = useRef(false);
  const marcar = (id: string) => {
    usuarioMexeu.current = true;
    setSelecionadas((atual) => {
      const proximas = new Set(atual);
      if (proximas.has(id)) proximas.delete(id);
      else proximas.add(id);
      return proximas;
    });
  };
  useEffect(() => {
    if (usuarioMexeu.current) return;
    setSelecionadas(new Set(todasIds));
  }, [todasIds]);

  const cardsSelecionados = useMemo(
    () => cards.filter((c) => selecionadas.has(c.inscricao.id)),
    [cards, selecionadas]
  );

  // Folhas de impressão: até 6 cards por página A4 (2x3).
  const paginas = useMemo(
    () => agruparEmFolhas(cardsSelecionados, 6),
    [cardsSelecionados]
  );

  if (!evento) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
      {/* Interface da aplicação — oculta na impressão */}
      <div className="print:hidden">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/admin/eventos/${eventoId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o evento
          </Link>
          <Button
            onClick={() => window.print()}
            disabled={cardsSelecionados.length === 0}
          >
            <Printer className="h-4 w-4" />
            Imprimir cards (A4)
          </Button>
        </div>

        <header className="mb-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
            <CreditCard className="h-6 w-6 text-brand-blue" />
            Cards oficiais
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {evento.nome} · credencial oficial 8,5×5,5 cm com QR. Somente as provas configuradas
            como "Card (credencial 8,5×5,5 cm)" aparecem aqui.
          </p>
        </header>

        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhum card disponível. Cadastre uma prova com identificação por Card nas{" "}
              <Link
                href={`/admin/eventos/${eventoId}/provas`}
                className="font-medium text-brand-blue hover:underline"
              >
                Provas
              </Link>{" "}
              para gerar as credenciais dos atletas confirmados.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {cardsSelecionados.length} de {cards.length} card
                {cards.length === 1 ? "" : "s"} selecionado
                {cards.length === 1 ? "" : "s"} para impressão · 6 por folha A4
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="px-3 py-2 text-xs"
                  onClick={() => {
                    usuarioMexeu.current = true;
                    setSelecionadas(new Set(todasIds));
                  }}
                >
                  Selecionar todos
                </Button>
                <Button
                  variant="ghost"
                  className="px-3 py-2 text-xs"
                  onClick={() => {
                    usuarioMexeu.current = true;
                    setSelecionadas(new Set());
                  }}
                >
                  Limpar seleção
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {cards.map(({ inscricao, cor, categoriaNome, foto, participacao }) => {
                const marcado = selecionadas.has(inscricao.id);
                return (
                  <div
                    key={inscricao.id}
                    role="checkbox"
                    aria-checked={marcado}
                    tabIndex={0}
                    onClick={() => marcar(inscricao.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        marcar(inscricao.id);
                      }
                    }}
                    className={`relative cursor-pointer rounded-xl transition-shadow ${
                      marcado
                        ? "ring-2 ring-brand-green ring-offset-2"
                        : "ring-2 ring-transparent hover:ring-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute -left-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-md ${
                        marcado ? "bg-brand-green" : "bg-slate-300"
                      }`}
                    >
                      {marcado ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                    </span>
                    <CrachaComQr
                      inscricaoId={inscricao.id}
                      atletaNome={nomeDaInscricao(inscricao)}
                      categoriaNome={categoriaNome}
                      cor={cor}
                      eventoNome={evento.nome}
                      dataEvento={formatarData(evento.data)}
                      localEvento={evento.local}
                      fotoUrl={foto}
                      participacao={participacao}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Impressão: SOMENTE os cards selecionados, até 6 por folha A4 (2x3),
          cada card exatamente 8,5x5,5 cm, sem nenhum outro elemento. */}
      {cardsSelecionados.length > 0 && (
        <div className="hidden print:block">
          {paginas.map((pagina, pageIdx) => (
            <div key={pageIdx} className="folha-cards-oficiais">
              {pagina.map(({ inscricao, cor, categoriaNome, foto, participacao }) => (
                <CrachaComQr
                  key={inscricao.id}
                  inscricaoId={inscricao.id}
                  atletaNome={nomeDaInscricao(inscricao)}
                  categoriaNome={categoriaNome}
                  cor={cor}
                  eventoNome={evento.nome}
                  dataEvento={formatarData(evento.data)}
                  localEvento={evento.local}
                  fotoUrl={foto}
                  participacao={participacao}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html,
          body {
            margin: 0;
            background: #fff !important;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          aside {
            display: none !important;
          }
          div.h-1 {
            display: none !important;
          }
          .folha-cards-oficiais {
            width: 21cm;
            height: 29.7cm;
            box-sizing: border-box;
            overflow: hidden;
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            display: grid;
            grid-template-columns: repeat(2, 8.5cm);
            grid-template-rows: repeat(3, 5.5cm);
            gap: 0.35cm;
            justify-content: center;
            align-content: center;
            background: #fff;
          }
          .folha-cards-oficiais:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}