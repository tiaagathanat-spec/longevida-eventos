"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, Printer } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas, identificacaoDaProva } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { usePerfis } from "@/lib/mock/perfis-store";
import { useQrDaInscricao } from "@/lib/mock/qrcodes-store";
import type { Inscricao } from "@/lib/mock/inscricoes-store";
import type { Categoria } from "@/lib/mock/categorias-store";
import type { Atleta } from "@/lib/mock/atletas-store";
import { Button } from "@/components/ui/button";
import { CrachaAtleta } from "@/components/cracha/cracha-atleta";

type ItemCard = {
  inscricao: Inscricao;
  categoria: Categoria;
  atleta: Atleta;
  foto?: string;
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
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { atletas } = useAtletas();
  const { obterPorEmail } = usePerfis();

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
      const foto = obterPorEmail(atleta.email)?.foto;
      itens.push({ inscricao, categoria, atleta, foto });
    }
    return itens.sort((a, b) => a.inscricao.atletaNome.localeCompare(b.inscricao.atletaNome));
  }, [inscricoes, provas, categorias, atletas, eventoId, obterPorEmail]);

  if (!evento) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
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
          disabled={cards.length === 0}
        >
          <Printer className="h-4 w-4" />
          Imprimir cards (A4)
        </Button>
      </div>

      <header className="mb-8">
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
          <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
            {cards.length} card{cards.length === 1 ? "" : "s"} pronto
            {cards.length === 1 ? "" : "s"} para impressão.
          </p>
          <div className="cards-grelha flex flex-wrap justify-center gap-4">
            {cards.map(({ inscricao, categoria, foto }) => (
              <CrachaComQr
                key={inscricao.id}
                inscricaoId={inscricao.id}
                atletaNome={inscricao.atletaNome}
                categoriaNome={categoria.nome}
                eventoNome={evento.nome}
                dataEvento={formatarData(evento.data)}
                localEvento={evento.local}
                fotoUrl={foto}
              />
            ))}
          </div>
        </>
      )}

      {/* Impressão: credenciais de 8,5cm x 5,5cm dispostas em grade de
          2 colunas por folha A4. */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5cm;
          }
          .cards-grelha {
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
