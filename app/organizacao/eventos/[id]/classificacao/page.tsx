"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Medal, Clock3, Globe, Lock } from "lucide-react";
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

const MEDALHA: Record<number, string> = {
  1: "text-amber-500",
  2: "text-slate-400",
  3: "text-orange-700",
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarTempo(segundos: number) {
  const min = Math.floor(segundos / 60);
  const resto = segundos - min * 60;
  return `${String(min).padStart(2, "0")}:${resto.toFixed(2).padStart(5, "0")}`;
}

export default function ClassificacaoPage() {
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
  const [confirmandoPublicacao, setConfirmandoPublicacao] = useState(false);
  const [confirmandoDespublicacao, setConfirmandoDespublicacao] = useState(false);

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

  // Classificação é sempre recalculada a partir dos tempos lançados —
  // nunca armazenada manualmente, por isso "automática".
  const { classificados, aguardando } = useMemo(() => {
    const comTempo = inscritosDaProva
      .map((inscricao) => ({
        inscricao,
        tempo: obterPorInscricao(inscricao.id)?.tempo ?? "",
      }))
      .filter((i) => i.tempo.trim() !== "");

    const semTempo = inscritosDaProva.filter(
      (inscricao) => !obterPorInscricao(inscricao.id)?.tempo
    );

    const ranking = classificar(
      comTempo.map(({ inscricao, tempo }) => ({ item: inscricao, tempo }))
    );

    return { classificados: ranking, aguardando: semTempo };
  }, [inscritosDaProva, obterPorInscricao]);

  if (!evento) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link href="/organizacao/eventos" className="mt-4 inline-block text-sm font-medium text-brand-green hover:underline">
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  const publicado = provaId ? estaPublicado(provaId) : false;
  const dataPublicacao = provaId ? obterDataPublicacao(provaId) : undefined;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/organizacao/eventos/${eventoId}/resultados`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Lançamento de Resultados
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Classificação</h1>
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
              (publicado ? (
                <Button
                  variant="ghost"
                  onClick={() => setConfirmandoDespublicacao(true)}
                  className="text-slate-500"
                >
                  <Lock className="h-4 w-4" />
                  Despublicar
                </Button>
              ) : (
                <Button onClick={() => setConfirmandoPublicacao(true)}>
                  <Globe className="h-4 w-4" />
                  Publicar resultados
                </Button>
              ))}
          </div>

          {publicado && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-brand-green/10 px-4 py-2.5 text-sm text-brand-green">
              <Globe className="h-4 w-4" />
              Resultado oficial — publicado em {dataPublicacao ? formatarDataHora(dataPublicacao) : ""}
            </div>
          )}

          {classificados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum tempo lançado para esta prova ainda.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                <Trophy className="h-4 w-4 text-brand-blue" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Classificação final
                </span>
              </div>
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {classificados.map(({ colocacao, item: inscricao, segundos }) => (
                  <div key={inscricao.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                          colocacao <= 3
                            ? `${MEDALHA[colocacao]} bg-current/10`
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {colocacao <= 3 ? <Medal className="h-4 w-4" /> : colocacao}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {inscricao.atletaNome}
                      </span>
                    </div>
                    <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
                      {formatarTempo(segundos)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aguardando.length > 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Clock3 className="h-3.5 w-3.5" />
                Aguardando resultado
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                {aguardando.map((i) => (
                  <span key={i.id}>{i.atletaNome}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmandoPublicacao}
        title="Publicar resultados"
        description="Ao publicar, esta classificação passa a ser o resultado oficial da prova e os tempos ficam travados para edição. Deseja continuar?"
        confirmLabel="Publicar"
        onCancel={() => setConfirmandoPublicacao(false)}
        onConfirm={() => {
          publicar(provaId);
          setConfirmandoPublicacao(false);
        }}
      />

      <ConfirmDialog
        open={confirmandoDespublicacao}
        title="Despublicar resultados"
        description="Os tempos voltarão a ficar editáveis e deixarão de ser o resultado oficial até serem publicados novamente."
        confirmLabel="Despublicar"
        onCancel={() => setConfirmandoDespublicacao(false)}
        onConfirm={() => {
          despublicar(provaId);
          setConfirmandoDespublicacao(false);
        }}
      />
    </div>
  );
}
