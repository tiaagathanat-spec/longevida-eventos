"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useTiposProva } from "@/lib/mock/tipos-prova-store";
import { useEtapasProva } from "@/lib/mock/etapas-prova-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { useInscricoes, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import { usePerfis } from "@/lib/mock/perfis-store";
import { useSessao } from "@/lib/mock/sessao";
import { useQrDaInscricao } from "@/lib/mock/qrcodes-store";
import {
  useFaixasNumeracao,
  resolverGrupoNumeracao,
  type CorFaixa,
} from "@/lib/mock/faixas-numeracao-store";
import { agruparEmFolhas } from "@/lib/impressao/agrupar-em-folhas";
import { montarParticipacao } from "@/lib/dorsais/dados-participacao";
import { Button } from "@/components/ui/button";
import { CrachaAtleta } from "@/components/cracha/cracha-atleta";

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

export default function CredenciaisPage() {
  const { sessao } = useSessao();
  const { eventos } = useEventos();
  const { categorias } = useCategorias();
  const { modalidades } = useModalidades();
  const { provas } = useProvas();
  const { tiposProva } = useTiposProva();
  const { listarPorProva: listarEtapasDaProva } = useEtapasProva();
  const { atletas } = useAtletas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao: obterDorsal } = useDorsais();
  const { obterPorEmail } = usePerfis();
  const { obterCriterio, obter: obterFaixa } = useFaixasNumeracao();

  const meusNomesDeAtletas = useMemo(
    () =>
      new Set(
        atletas
          .filter((a) => a.responsavelNome === sessao.nome)
          .map((a) => a.nome)
      ),
    [atletas, sessao.nome]
  );

  const credenciais = useMemo(
    () =>
      inscricoes
        .filter(
          (i) => i.status === "confirmada" && meusNomesDeAtletas.has(i.atletaNome)
        )
        .map((inscricao) => {
          const evento = eventos.find((e) => e.id === inscricao.eventoId);
          const prova = provas.find((p) => p.id === inscricao.provaId);
          const categoria = categorias.find((c) => c.id === prova?.categoriaId);
          const modalidade = modalidades.find((m) => m.id === prova?.modalidadeId);
          const tipoProva = tiposProva.find((t) => t.id === prova?.tipoProvaId);
          const dorsal = obterDorsal(inscricao.id);
          const atleta = atletas.find((a) => a.nome === inscricao.atletaNome);
          const foto = atleta ? obterPorEmail(atleta.email)?.foto : undefined;
          // A cor e o rótulo da categoria vêm da MESMA fonte das faixas e
          // dorsais, para a credencial do atleta ter a mesma cor do dorsal.
          const grupo = resolverGrupoNumeracao(
            obterCriterio(inscricao.eventoId),
            categoria,
            atleta
          );
          return {
            inscricao,
            evento,
            categoria,
            atleta,
            foto,
            cor: (obterFaixa(inscricao.eventoId, grupo.grupoId)?.cor ??
              "azul") as CorFaixa,
            categoriaNome: grupo.grupoNome,
            participacao: montarParticipacao({
              inscricao,
              prova,
              modalidade,
              categoria,
              tipoProva,
              dorsal,
              etapas: listarEtapasDaProva(inscricao.provaId),
            }),
          };
        })
        .filter((c) => c.evento && c.atleta && c.categoria)
        .sort((a, b) =>
          a.inscricao.atletaNome.localeCompare(b.inscricao.atletaNome)
        ),
    [inscricoes, eventos, provas, categorias, modalidades, tiposProva, atletas, obterPorEmail, obterDorsal, obterCriterio, obterFaixa, listarEtapasDaProva, meusNomesDeAtletas]
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
      {/* Barra de ação — some ao imprimir */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Credenciais
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Credencial oficial das inscrições confirmadas. Imprima e apresente no
            check-in do evento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/minhas-inscricoes"
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
      </div>

      {credenciais.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950 print:hidden">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma credencial disponível ainda. Elas aparecem para inscrições
            confirmadas.
          </p>
          <Link
            href="/portal/eventos"
            className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline"
          >
            Ver eventos disponíveis
          </Link>
        </div>
      ) : (
        <div className="credenciais-grelha flex flex-wrap justify-center gap-4">
          {credenciais.map(({ inscricao, evento, cor, categoriaNome, foto, participacao }) => (
            <CrachaComQr
              key={inscricao.id}
              inscricaoId={inscricao.id}
              atletaNome={nomeDaInscricao(inscricao)}
              categoriaNome={categoriaNome}
              cor={cor}
              eventoNome={evento!.nome}
              dataEvento={formatarData(evento!.data)}
              localEvento={evento!.local}
              fotoUrl={foto}
              participacao={participacao}
            />
          ))}
        </div>
      )}

      {/* Impressão: credenciais de 8,5cm x 5,5cm em até 6 por folha A4
          (2x3), cada uma exatamente do tamanho físico, com quebras de página
          explícitas. */}
      {credenciais.length > 0 && (
        <div className="hidden print:block">
          {agruparEmFolhas(credenciais, 6).map((pagina, pageIdx) => (
            <div key={pageIdx} className="folha-cards-oficiais">
              {pagina.map(({ inscricao, evento, cor, categoriaNome, foto, participacao }) => (
                <CrachaComQr
                  key={inscricao.id}
                  inscricaoId={inscricao.id}
                  atletaNome={nomeDaInscricao(inscricao)}
                  categoriaNome={categoriaNome}
                  cor={cor}
                  eventoNome={evento!.nome}
                  dataEvento={formatarData(evento!.data)}
                  localEvento={evento!.local}
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
          header,
          nav,
          aside {
            display: none !important;
          }
          div.h-1 {
            display: none !important;
          }
          .credenciais-grelha {
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
