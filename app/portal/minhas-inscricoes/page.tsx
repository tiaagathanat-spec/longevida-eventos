"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, QrCode } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useInscricoes, InscricaoStatus, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import { useSessao } from "@/lib/mock/sessao";
import { useQrDaInscricao } from "@/lib/mock/qrcodes-store";
import { ModalQrInscricao } from "@/components/qrcode/modal-qr-inscricao";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

const STATUS_LABEL: Record<InscricaoStatus, string> = {
  pendente: "Pagamento pendente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const STATUS_STYLE: Record<InscricaoStatus, string> = {
  pendente: "bg-amber-100 text-amber-600",
  confirmada: "bg-brand-green/10 text-brand-green",
  cancelada: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export default function MinhasInscricoesPage() {
  const { sessao } = useSessao();
  const { eventos } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { atletas } = useAtletas();
  const { inscricoes, erro: erroInscricoes } = useInscricoes();
  const [inscricaoQrId, setInscricaoQrId] = useState<string | null>(null);

  const inscricaoComQr = inscricoes.find((i) => i.id === inscricaoQrId);
  const qrDaInscricao = useQrDaInscricao(inscricaoQrId ?? "");

  const meusNomesDeAtletas = useMemo(
    () =>
      new Set(
        atletas
          .filter((a) => a.responsavelNome === sessao.nome)
          .map((a) => a.nome)
      ),
    [atletas, sessao.nome]
  );

  const minhasInscricoes = useMemo(
    () => inscricoes.filter((i) => meusNomesDeAtletas.has(i.atletaNome)),
    [inscricoes, meusNomesDeAtletas]
  );

  function nomeEvento(id: string) {
    return eventos.find((e) => e.id === id)?.nome ?? "—";
  }
  function descricaoProva(provaId: string) {
    const prova = provas.find((p) => p.id === provaId);
    if (!prova) return "—";
    const modalidade = modalidades.find((m) => m.id === prova.modalidadeId)?.nome ?? "—";
    const categoria = categorias.find((c) => c.id === prova.categoriaId)?.nome ?? "—";
    return `${modalidade} · ${categoria}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Minhas inscrições
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Inscrições dos seus atletas em todos os eventos.
        </p>
      </header>

      <AlertaPersistencia erro={erroInscricoes} />

      {minhasInscricoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma inscrição ainda.
          </p>
          <Link href="/portal/eventos" className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline">
            Ver eventos disponíveis
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {minhasInscricoes.map((inscricao) => (
            <div
              key={inscricao.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-blue/10 p-2">
                  <ClipboardList className="h-4 w-4 text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {nomeDaInscricao(inscricao)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {nomeEvento(inscricao.eventoId)} · {descricaoProva(inscricao.provaId)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[inscricao.status]}`}
                >
                  {STATUS_LABEL[inscricao.status]}
                </span>
                {inscricao.status === "confirmada" && (
                  <button
                    type="button"
                    onClick={() => setInscricaoQrId(inscricao.id)}
                    title="Ver QR Code da inscrição"
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR Code
                  </button>
                )}
                {inscricao.status === "pendente" && (
                  <Link
                    href={`/portal/eventos/${inscricao.eventoId}/pagamento`}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    Pagar
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {inscricaoComQr && qrDaInscricao && (
        <ModalQrInscricao
          aberto
          onFechar={() => setInscricaoQrId(null)}
          conteudo={qrDaInscricao.identificador}
          identificador={qrDaInscricao.identificador}
          subtitulo={`${nomeDaInscricao(inscricaoComQr)} · ${nomeEvento(inscricaoComQr.eventoId)} · ${descricaoProva(inscricaoComQr.provaId)}`}
        />
      )}
    </div>
  );
}
