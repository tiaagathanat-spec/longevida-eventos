"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Lock, Unlock, ShieldCheck } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { usePublicacoes } from "@/lib/mock/publicacoes-store";
import { classificar } from "@/lib/mock/classificacao";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Módulo Classificação Automática.
//
// A classificação nunca é digitada — é sempre recalculada a partir dos
// tempos salvos em resultados-store, então qualquer tempo lançado ou
// editado (seja pela tela de Cronometragem ou pela de Lançamento de
// Resultados) já aparece refletido aqui automaticamente, sem nenhuma
// ação extra.
//
// O "bloqueio após homologação" reaproveita o mesmo mecanismo de
// publicação já existente (lib/mock/publicacoes-store.tsx, da Etapa 16)
// — não duplica lógica nem cria um segundo controle de trava
// desalinhado do resto do sistema.

const MEDALHA: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClassificacaoAutomaticaPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao } = useResultados();
  const { estaPublicado, obterDataPublicacao, publicar, despublicar } = usePublicacoes();

  const evento = obterEvento(eventoId);
  const provasDoEvento = useMemo(
    () => provas.filter((p) => p.eventoId === eventoId),
    [provas, eventoId]
  );

  const [provaId, setProvaId] = useState(provasDoEvento[0]?.id ?? "");
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState(false);
  const [confirmandoDesbloqueio, setConfirmandoDesbloqueio] = useState(false);

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  const inscritosDaProva = useMemo(
    () => inscricoes.filter((i) => i.provaId === provaId && i.status === "confirmada"),
    [inscricoes, provaId]
  );

  // Recalculada a cada render a partir dos tempos atuais — sempre que um
  // tempo muda em qualquer outra tela, esta lista reflete na próxima vez
  // que o componente renderizar (o que já acontece automaticamente,
  // porque resultados-store é um Context compartilhado).
  const classificados = useMemo(() => {
    const comTempo = inscritosDaProva
      .map((inscricao) => ({ inscricao, tempo: obterPorInscricao(inscricao.id)?.tempo ?? "" }))
      .filter((i) => i.tempo.trim() !== "");

    return classificar(comTempo.map(({ inscricao, tempo }) => ({ item: inscricao, tempo })));
  }, [inscritosDaProva, obterPorInscricao]);

  if (!evento) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link href="/admin/eventos" className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline">
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  const bloqueada = provaId ? estaPublicado(provaId) : false;
  const dataBloqueio = provaId ? obterDataPublicacao(provaId) : undefined;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/admin/eventos/${eventoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o evento
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Classificação Automática
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
      </header>

      {provasDoEvento.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este evento ainda não tem provas cadastradas.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-sm flex-1">
              <Select
                id="prova"
                label="Prova"
                value={provaId}
                onChange={(e) => setProvaId(e.target.value)}
              >
                {provasDoEvento.map((p) => (
                  <option key={p.id} value={p.id}>
                    {nomeModalidade(p.modalidadeId)} · {nomeCategoria(p.categoriaId)}
                    {p.horario ? ` · ${p.horario}` : ""}
                  </option>
                ))}
              </Select>
            </div>

            {classificados.length > 0 &&
              (bloqueada ? (
                <Button variant="ghost" onClick={() => setConfirmandoDesbloqueio(true)} className="text-slate-500">
                  <Unlock className="h-4 w-4" />
                  Desbloquear
                </Button>
              ) : (
                <Button onClick={() => setConfirmandoBloqueio(true)}>
                  <Lock className="h-4 w-4" />
                  Bloquear classificação
                </Button>
              ))}
          </div>

          {bloqueada && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-brand-green/10 px-4 py-2.5 text-sm text-brand-green">
              <ShieldCheck className="h-4 w-4" />
              Classificação homologada e bloqueada em{" "}
              {dataBloqueio ? formatarDataHora(dataBloqueio) : ""}
            </div>
          )}

          {classificados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum tempo lançado para esta prova ainda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                <Trophy className="h-4 w-4 text-brand-blue" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Classificação
                </span>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-5 py-2.5 font-medium">Colocação</th>
                    <th className="px-5 py-2.5 font-medium">Peito</th>
                    <th className="px-5 py-2.5 font-medium">Nome</th>
                    <th className="px-5 py-2.5 font-medium">Tempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classificados.map(({ colocacao, item: inscricao, segundos }) => (
                    <tr
                      key={inscricao.id}
                      className={colocacao <= 3 ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}
                    >
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                        {MEDALHA[colocacao] ? (
                          <span className="text-lg">{MEDALHA[colocacao]}</span>
                        ) : (
                          colocacao
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        {inscricao.numeroPeito || "—"}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                        {inscricao.atletaNome}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                        {segundos.toFixed(2)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmandoBloqueio}
        title="Bloquear classificação"
        description="Ao bloquear, esta classificação é homologada como oficial e os tempos ficam travados para edição nas telas de lançamento. Deseja continuar?"
        confirmLabel="Bloquear"
        onCancel={() => setConfirmandoBloqueio(false)}
        onConfirm={() => {
          publicar(provaId);
          setConfirmandoBloqueio(false);
        }}
      />

      <ConfirmDialog
        open={confirmandoDesbloqueio}
        title="Desbloquear classificação"
        description="Os tempos voltarão a poder ser editados e a classificação deixa de ser oficial até ser bloqueada novamente."
        confirmLabel="Desbloquear"
        onCancel={() => setConfirmandoDesbloqueio(false)}
        onConfirm={() => {
          despublicar(provaId);
          setConfirmandoDesbloqueio(false);
        }}
      />
    </div>
  );
}
