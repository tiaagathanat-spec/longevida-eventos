"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Printer } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useProvas, identificacaoDaProva } from "@/lib/mock/provas-store";
import { useTiposProva } from "@/lib/mock/tipos-prova-store";
import { useEtapasProva } from "@/lib/mock/etapas-prova-store";
import { useInscricoes, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import {
  useFaixasNumeracao,
  resolverGrupoNumeracao,
  type CorFaixa,
} from "@/lib/mock/faixas-numeracao-store";
import { useGaleria } from "@/lib/mock/galeria-store";
import { useQrDaInscricao } from "@/lib/mock/qrcodes-store";
import { agruparEmFolhas } from "@/lib/impressao/agrupar-em-folhas";
import { montarParticipacao, type DadosParticipacao } from "@/lib/dorsais/dados-participacao";
import { Button } from "@/components/ui/button";
import { CartaoDorsal } from "@/components/dorsais/cartao-dorsal";
import { normalizarNomePessoa } from "@/lib/utils/nomes";

type ItemDorsal = {
  inscricaoId: string;
  numero: number;
  atletaNome: string;
  categoriaNome: string;
  cor: CorFaixa;
  medalhaEntregue: boolean;
  alimentacaoEntregue: boolean;
  kitEntregue: boolean;
  participacao: DadosParticipacao;
};

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Envolve o CartaoDorsal para buscar o QR da inscrição via hook
// (hooks não podem ser chamados dentro de um .map()).
function CartaoComQr({
  inscricaoId,
  ...props
}: ComponentProps<typeof CartaoDorsal> & { inscricaoId: string }) {
  const qr = useQrDaInscricao(inscricaoId);
  return <CartaoDorsal {...props} qrcodeConteudo={qr?.identificador} />;
}

export default function ImprimirDorsaisPage() {
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
  const { obterPorInscricao } = useDorsais();
  const { obterCriterio, obter: obterFaixa } = useFaixasNumeracao();
  const { listarPorEvento: listarImagensDoEvento } = useGaleria();

  const evento = obterEvento(eventoId);
  const imagensDoEvento = listarImagensDoEvento(eventoId);
  const logo =
    evento?.logoUrl ||
    imagensDoEvento.find((img) => img.categoria === "logo")?.url;
  const capa =
    imagensDoEvento.find((img) => img.categoria === "capa")?.url ||
    imagensDoEvento.find((img) => img.categoria === "banner")?.url;

  const dorsais = useMemo(() => {
    return inscricoes
      .filter((i) => i.eventoId === eventoId && i.status === "confirmada")
      .filter((i) => {
        const prova = provas.find((p) => p.id === i.provaId);
        return prova && identificacaoDaProva(prova) === "dorsal";
      })
      .map((inscricao) => {
        const prova = provas.find((p) => p.id === inscricao.provaId);
        const categoria = categorias.find((c) => c.id === prova?.categoriaId);
        const modalidade = modalidades.find((m) => m.id === prova?.modalidadeId);
        const tipoProva = tiposProva.find((t) => t.id === prova?.tipoProvaId);
        const atleta = atletas.find((a) => a.nome === inscricao.atletaNome);
        const grupo = resolverGrupoNumeracao(
          obterCriterio(eventoId),
          categoria,
          atleta
        );
        const dorsal = obterPorInscricao(inscricao.id);
        if (!dorsal) return null;
        return {
          inscricao,
          dorsal,
          item: {
            inscricaoId: inscricao.id,
            numero: dorsal.numero ?? 0,
            atletaNome: normalizarNomePessoa(nomeDaInscricao(inscricao)),
            categoriaNome: grupo.grupoNome,
            cor: obterFaixa(eventoId, grupo.grupoId)?.cor ?? "azul",
            medalhaEntregue: Boolean(dorsal.medalhaEntregue),
            alimentacaoEntregue: Boolean(dorsal.alimentacaoEntregue),
            kitEntregue: Boolean(dorsal.kitEntregue),
            participacao: montarParticipacao({
              inscricao,
              prova,
              modalidade,
              categoria,
              tipoProva,
              dorsal,
              etapas: listarEtapasDaProva(inscricao.provaId),
            }),
          } satisfies ItemDorsal,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => a.item.numero - b.item.numero);
  }, [inscricoes, provas, categorias, modalidades, tiposProva, atletas, eventoId, obterCriterio, obterFaixa, obterPorInscricao, listarEtapasDaProva]);

  // Seleção dos dorsais a imprimir (padrão: todos, quando os dados carregam).
  const todasIds = useMemo(() => dorsais.map((d) => d.inscricao.id), [dorsais]);
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

  const dorsaisSelecionados = useMemo(
    () => dorsais.filter((d) => selecionadas.has(d.inscricao.id)),
    [dorsais, selecionadas]
  );

  // Folhas A4 retrato: 2 dorsais de 19x14,5 cm empilhados (escala 100%).
  const paginas = useMemo(
    () => agruparEmFolhas(dorsaisSelecionados, 2),
    [dorsaisSelecionados]
  );

  if (!evento) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Interface da aplicação — oculta na impressão */}
      <div className="print:hidden">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/admin/eventos/${eventoId}/dorsais`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <Button
            onClick={() => window.print()}
            disabled={dorsaisSelecionados.length === 0}
          >
            <Printer className="h-4 w-4" />
            Imprimir dorsais (A4)
          </Button>
        </div>

        {dorsais.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhum dorsal atribuído ainda para este evento.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {dorsaisSelecionados.length} de {dorsais.length} dorsal
                {dorsais.length === 1 ? "" : "is"} selecionado
                {dorsais.length === 1 ? "" : "s"} para impressão · 2 por folha A4,
                tamanho real 19×14,5 cm
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
              {dorsais.map(({ inscricao, item }) => {
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
                    <div className="dorsal-preview">
                      <CartaoComQr
                        inscricaoId={inscricao.id}
                        numero={item.numero}
                        atletaNome={item.atletaNome}
                        categoriaNome={item.categoriaNome}
                        eventoNome={evento.nome}
                        dataEvento={formatarData(evento.data)}
                        capaUrl={capa}
                        logoUrl={logo}
                        cor={item.cor}
                        medalhaEntregue={item.medalhaEntregue}
                        alimentacaoEntregue={item.alimentacaoEntregue}
                        kitEntregue={item.kitEntregue}
                        participacao={item.participacao}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Impressão: SOMENTE os dorsais selecionados, 2 por folha A4
          retrato, cada dorsal exatamente 19x14,5 cm (escala 100%), sem
          nenhum outro elemento. */}
      {dorsaisSelecionados.length > 0 && (
        <div className="hidden print:block">
          {paginas.map((pagina, pageIdx) => (
            <div key={pageIdx} className="folha-dorsais">
              {pagina.map(({ inscricao, item }) => (
                <div key={inscricao.id} className="dorsal-impressao">
                  <CartaoComQr
                    inscricaoId={inscricao.id}
                    numero={item.numero}
                    atletaNome={item.atletaNome}
                    categoriaNome={item.categoriaNome}
                    eventoNome={evento.nome}
                    dataEvento={formatarData(evento.data)}
                    capaUrl={capa}
                    logoUrl={logo}
                    cor={item.cor}
                    medalhaEntregue={item.medalhaEntregue}
                    alimentacaoEntregue={item.alimentacaoEntregue}
                    kitEntregue={item.kitEntregue}
                    participacao={item.participacao}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .dorsal-preview {
          width: 11.4cm;
          height: 8.7cm;
        }
        @media print {
          @page {
            size: A4 portrait;
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
          .folha-dorsais {
            width: 21cm;
            height: 29.7cm;
            box-sizing: border-box;
            overflow: hidden;
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.35cm;
            background: #fff;
          }
          .folha-dorsais:last-child {
            page-break-after: auto;
          }
          .dorsal-impressao {
            width: 19cm;
            height: 14.5cm;
            flex-shrink: 0;
            display: flex;
            align-items: stretch;
            justify-content: stretch;
          }
        }
      `}</style>
    </div>
  );
}