"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
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
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { atletas } = useAtletas();
  const { obterPorInscricao } = useDorsais();
  const { obterCriterio, obter: obterFaixa } = useFaixasNumeracao();
  const { listarPorEvento: listarImagensDoEvento } = useGaleria();

  const evento = obterEvento(eventoId);
  const logo = evento?.logoUrl || listarImagensDoEvento(eventoId).find((img) => img.categoria === "logo")?.url;

  const cartoes = useMemo(() => {
    return inscricoes
      .filter((i) => i.eventoId === eventoId && i.status === "confirmada")
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
        <div className="flex flex-col items-center gap-8">
          {cartoes.map(({ inscricao, grupoNome, cor, dorsal }) => (
            // Um dorsal por folha, tamanho físico final de 19 cm x 14,5 cm
            <div
              key={inscricao.id}
              className="dorsal-pagina-imprimir flex w-full items-center justify-center break-inside-avoid"
            >
              <div className="dorsal-card-tamanho h-[14.5cm] w-[19cm] shrink-0">
                <CartaoComQr
                  inscricaoId={inscricao.id}
                  numero={dorsal!.numero}
                  atletaNome={inscricao.atletaNome}
                  categoriaNome={grupoNome}
                  eventoNome={evento.nome}
                  dataEvento={formatarData(evento.data)}
                  logoUrl={logo}
                  cor={cor}
                  medalhaEntregue={dorsal!.medalhaEntregue}
                  alimentacaoEntregue={dorsal!.alimentacaoEntregue}
                  kitEntregue={dorsal!.kitEntregue}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Impressão: cada dorsal ocupa uma folha A4 e mede exatamente
          19 cm de largura por 14,5 cm de altura (o card já é dimensionado
          com essas medidas na tela, então o preview reflete o resultado). */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          .dorsal-pagina-imprimir {
            height: 29.7cm;
            page-break-after: always;
          }
          .dorsal-pagina-imprimir:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
