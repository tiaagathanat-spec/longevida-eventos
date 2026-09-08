"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas, identificacaoDaProva } from "@/lib/mock/provas-store";
import { useInscricoes, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import {
  useFaixasNumeracao,
  resolverGrupoNumeracao,
} from "@/lib/mock/faixas-numeracao-store";
import { useGaleria } from "@/lib/mock/galeria-store";
import { useQrDaInscricao } from "@/lib/mock/qrcodes-store";
import { Button } from "@/components/ui/button";
import { CartaoDorsal } from "@/components/dorsais/cartao-dorsal";

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Envolve o CartaoDorsal para buscar o QR da inscrição via hook
function CartaoComQr({
  inscricaoId,
  ...props
}: ComponentProps<typeof CartaoDorsal> & { inscricaoId: string }) {
  const qr = useQrDaInscricao(inscricaoId);
  return <CartaoDorsal {...props} qrcodeConteudo={qr?.identificador} />;
}

export default function ImprimirCartoesPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
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

  const cartoes = useMemo(() => {
    return inscricoes
      .filter((i) => i.eventoId === eventoId && i.status === "confirmada")
      .filter((i) => {
        const prova = provas.find((p) => p.id === i.provaId);
        return prova && identificacaoDaProva(prova) === "dorsal";
      })
      .map((inscricao) => {
        const prova = provas.find((p) => p.id === inscricao.provaId);
        const categoria = categorias.find((c) => c.id === prova?.categoriaId);
        const atleta = atletas.find((a) => a.nome === inscricao.atletaNome);
        const grupo = resolverGrupoNumeracao(
          obterCriterio(eventoId),
          categoria,
          atleta
        );
        const dorsal = obterPorInscricao(inscricao.id);
        return {
          inscricao,
          grupoNome: grupo.grupoNome,
          cor: obterFaixa(eventoId, grupo.grupoId)?.cor ?? "azul",
          dorsal,
        };
      })
      .filter((item) => item.dorsal)
      .sort((a, b) => (a.dorsal!.numero ?? 0) - (b.dorsal!.numero ?? 0));
  }, [inscricoes, provas, categorias, atletas, eventoId, obterCriterio, obterFaixa, obterPorInscricao]);

  // Agrupar em grupos de 6 (2 linhas x 3 colunas = 6 por página A4 landscape)
  const paginas = useMemo(() => {
    const resultado = [];
    for (let i = 0; i < cartoes.length; i += 6) {
      resultado.push(cartoes.slice(i, i + 6));
    }
    return resultado;
  }, [cartoes]);

  function formatarData(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
      {/* Barra de ação — some ao imprimir */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/admin/eventos/${eventoId}/dorsais`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {cartoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950 print:hidden">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum dorsal atribuído ainda para este evento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-0">
          {paginas.map((pagina, pageIdx) => (
            <div
              key={pageIdx}
              className="cartoes-pagina-imprimir break-inside-avoid"
              style={{ height: "21cm", width: "29.7cm" }}
            >
              <div
                className="flex flex-col h-[21cm] w-[29.7cm] items-center justify-between gap-0"
                style={{ height: "21cm", width: "29.7cm" }}
              >
                {/* Linha 1: 3 cartões */}
                <div className="flex gap-0 justify-center" style={{ width: "29.7cm" }}>
                  {pagina.slice(0, 3).map((item, i) => (
                    <div
                      key={`${pageIdx}-row1-${i}`}
                      className="cartao-wrapper shrink-0"
                      style={{ width: "9.9cm", height: "14.5cm" }}
                    >
                      <CartaoComQr
                        inscricaoId={item.inscricao.id}
                        numero={item.dorsal!.numero}
                        atletaNome={nomeDaInscricao(item.inscricao)}
                        categoriaNome={item.grupoNome}
                        eventoNome={evento.nome}
                        dataEvento={formatarData(evento.data)}
                        capaUrl={capa}
                        logoUrl={logo}
                        cor={item.cor}
                        medalhaEntregue={item.dorsal!.medalhaEntregue}
                        alimentacaoEntregue={item.dorsal!.alimentacaoEntregue}
                        kitEntregue={item.dorsal!.kitEntregue}
                      />
                    </div>
                  ))}
                </div>
                {/* Linha 2: 3 cartões */}
                <div className="flex gap-0 justify-center" style={{ width: "29.7cm" }}>
                  {pagina.slice(3, 6).map((item, i) => (
                    <div
                      key={`${pageIdx}-row2-${i}`}
                      className="cartao-wrapper shrink-0"
                      style={{ width: "9.9cm", height: "14.5cm" }}
                    >
                      <CartaoComQr
                        inscricaoId={item.inscricao.id}
                        numero={item.dorsal!.numero}
                        atletaNome={nomeDaInscricao(item.inscricao)}
                        categoriaNome={item.grupoNome}
                        eventoNome={evento.nome}
                        dataEvento={formatarData(evento.data)}
                        capaUrl={capa}
                        logoUrl={logo}
                        cor={item.cor}
                        medalhaEntregue={item.dorsal!.medalhaEntregue}
                        alimentacaoEntregue={item.dorsal!.alimentacaoEntregue}
                        kitEntregue={item.dorsal!.kitEntregue}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          .cartoes-pagina-imprimir {
            height: 21cm;
            width: 29.7cm;
            page-break-after: always;
            overflow: hidden;
          }
          .cartoes-pagina-imprimir:last-child {
            page-break-after: auto;
          }
          .cartao-wrapper {
            width: 9.9cm;
            height: 14.5cm;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
        }
      `}</style>
    </div>
  );
}