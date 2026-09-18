"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, QrCode, Users, Pencil } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useInscricoes, Inscricao, InscricaoStatus, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import { useTiposProva, integrantesDaProva } from "@/lib/mock/tipos-prova-store";
import { useSessao } from "@/lib/mock/sessao";
import { useQrDaInscricao } from "@/lib/mock/qrcodes-store";
import { ModalQrInscricao } from "@/components/qrcode/modal-qr-inscricao";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";
import { normalizarNomePessoa } from "@/lib/utils/nomes";

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
  const { tiposProva } = useTiposProva();
  const { atletas } = useAtletas();
  const { inscricoes, atualizar, erro: erroInscricoes } = useInscricoes();
  const [inscricaoQrId, setInscricaoQrId] = useState<string | null>(null);

  // Edição da equipe de uma inscrição (2º, 3º... integrantes).
  const [editandoEquipeId, setEditandoEquipeId] = useState<string | null>(null);
  const [editandoEquipeNomes, setEditandoEquipeNomes] = useState<string[]>([]);

  const inscricaoEmEdicao = inscricoes.find((i) => i.id === editandoEquipeId);

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

  function integrantesDe(inscricao: Inscricao): number {
    const prova = provas.find((p) => p.id === inscricao.provaId);
    const tipo = tiposProva.find((t) => t.id === prova?.tipoProvaId);
    return integrantesDaProva(tipo);
  }

  function abrirEdicaoEquipe(inscricao: Inscricao) {
    const n = integrantesDe(inscricao);
    const nomes = Array.from({ length: Math.max(0, n - 1) }, () => "");
    nomes[0] = inscricao.atletaNome2 ?? "";
    nomes[1] = inscricao.atletaNome3 ?? "";
    nomes[2] = inscricao.atletaNome4 ?? "";
    setEditandoEquipeId(inscricao.id);
    setEditandoEquipeNomes(nomes);
  }

  function salvarEquipe() {
    if (!editandoEquipeId) return;
    const limpos = editandoEquipeNomes.map((nome) => nome.trim());
    if (limpos.some((nome) => !nome)) return;
    atualizar(editandoEquipeId, {
      atletaNome2: limpos[0] || undefined,
      atletaNome3: limpos[1] || undefined,
      atletaNome4: limpos[2] || undefined,
    });
    setEditandoEquipeId(null);
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
                    {normalizarNomePessoa(nomeDaInscricao(inscricao))}
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
                {inscricao.status !== "cancelada" && integrantesDe(inscricao) > 1 && (
                  <button
                    type="button"
                    onClick={() => abrirEdicaoEquipe(inscricao)}
                    title="Editar integrantes da equipe"
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <Pencil className="h-3 w-3" />
                    Equipe
                  </button>
                )}
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
          subtitulo={`${normalizarNomePessoa(nomeDaInscricao(inscricaoComQr))} · ${nomeEvento(inscricaoComQr.eventoId)} · ${descricaoProva(inscricaoComQr.provaId)}`}
        />
      )}
      {inscricaoEmEdicao && (
        <Modal
          open
          title={`Editar equipe`}
          onClose={() => setEditandoEquipeId(null)}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Atualize os nomes dos integrantes da equipe de{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {normalizarNomePessoa(nomeDaInscricao(inscricaoEmEdicao))}
            </span>{" "}
            ({integrantesDe(inscricaoEmEdicao)} no total).
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {editandoEquipeNomes.map((nome, idx) => (
              <Input
                key={idx}
                id={`editEquipe-${idx + 2}`}
                label={`${idx + 2}º integrante`}
                placeholder="Nome completo"
                value={nome}
                onChange={(e) =>
                  setEditandoEquipeNomes((atual) =>
                    atual.map((n, i) => (i === idx ? e.target.value : n))
                  )
                }
              />
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditandoEquipeId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={salvarEquipe}
              disabled={editandoEquipeNomes.some((nome) => !nome.trim())}
            >
              Salvar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
