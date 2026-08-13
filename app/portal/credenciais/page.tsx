"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { usePerfis } from "@/lib/mock/perfis-store";
import { useSessao } from "@/lib/mock/sessao";
import { useQrDaInscricao } from "@/lib/mock/qrcodes-store";
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
  const { provas } = useProvas();
  const { atletas } = useAtletas();
  const { inscricoes } = useInscricoes();
  const { obterPorEmail } = usePerfis();

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
          const atleta = atletas.find((a) => a.nome === inscricao.atletaNome);
          const foto = atleta ? obterPorEmail(atleta.email)?.foto : undefined;
          return { inscricao, evento, categoria, atleta, foto };
        })
        .filter((c) => c.evento && c.atleta && c.categoria)
        .sort((a, b) =>
          a.inscricao.atletaNome.localeCompare(b.inscricao.atletaNome)
        ),
    [inscricoes, eventos, provas, categorias, atletas, meusNomesDeAtletas, obterPorEmail]
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
          {credenciais.map(({ inscricao, evento, categoria, foto }) => (
            <CrachaComQr
              key={inscricao.id}
              inscricaoId={inscricao.id}
              atletaNome={inscricao.atletaNome}
              categoriaNome={categoria!.nome}
              eventoNome={evento!.nome}
              dataEvento={formatarData(evento!.data)}
              localEvento={evento!.local}
              fotoUrl={foto}
            />
          ))}
        </div>
      )}

      {/* Impressão: credenciais de 8,5cm x 5,5cm dispostas em grade de
          2 colunas por folha A4. */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5cm;
          }
          .credenciais-grelha {
            display: grid !important;
            grid-template-columns: repeat(2, 8.5cm);
            gap: 0.45cm !important;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
