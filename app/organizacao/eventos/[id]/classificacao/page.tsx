"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock3, Globe, Lock, ShieldAlert } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import {
  useProvas,
  situacaoDaProva,
  SITUACAO_PROVA_LABEL,
  SITUACAO_PROVA_CLASSE,
} from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { usePublicacoes } from "@/lib/mock/publicacoes-store";
import { classificarPorGrupos } from "@/lib/mock/classificacao-grupos";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TabelaClassificacaoGrupos } from "@/components/classificacao/tabela-classificacao-grupos";

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClassificacaoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { atletas } = useAtletas();
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

  const prova = provas.find((p) => p.id === provaId);
  const situacao = situacaoDaProva(prova);

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
  // nunca armazenada manualmente. Dividida por categoria · idade · sexo.
  const { grupos, aguardando } = useMemo(() => {
    const comTempo = inscritosDaProva
      .map((inscricao) => ({
        inscricao,
        tempo: obterPorInscricao(inscricao.id)?.tempo ?? "",
        atleta: atletas.find((a) => a.nome === inscricao.atletaNome),
        categoria: prova ? categorias.find((c) => c.id === prova.categoriaId) : undefined,
      }))
      .filter((i) => i.tempo.trim() !== "");

    const semTempo = inscritosDaProva.filter((i) => !obterPorInscricao(i.id)?.tempo);

    const grupos = classificarPorGrupos(
      comTempo.map(({ inscricao, tempo, atleta, categoria }) => ({
        item: inscricao,
        tempo,
        atleta,
        categoria,
      }))
    );

    return { grupos, aguardando: semTempo };
  }, [inscritosDaProva, obterPorInscricao, atletas, categorias, prova]);

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
  const oficial = situacao === "encerrada" && publicado;
  const temTempos = grupos.length > 0;

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

            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SITUACAO_PROVA_CLASSE[situacao]}`}
            >
              {SITUACAO_PROVA_LABEL[situacao]}
            </span>

            {temTempos &&
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
                <Button
                  onClick={() => setConfirmandoPublicacao(true)}
                  disabled={situacao !== "encerrada"}
                  title={
                    situacao !== "encerrada"
                      ? "Encerre a prova (Realizada) na tela de Provas antes de publicar os resultados."
                      : undefined
                  }
                >
                  <Globe className="h-4 w-4" />
                  Publicar resultados
                </Button>
              ))}
          </div>

          {oficial ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-brand-green/10 px-4 py-2.5 text-sm text-brand-green">
              <Globe className="h-4 w-4" />
              Resultado oficial — prova realizada e publicada em{" "}
              {dataPublicacao ? formatarDataHora(dataPublicacao) : ""}
            </div>
          ) : situacao === "encerrada" && temTempos ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4" />
              Prova realizada. Publique os resultados para oficializar medalhas e ranking.
            </div>
          ) : null}

          {temTempos ? (
            <TabelaClassificacaoGrupos grupos={grupos} oficial={oficial} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum tempo lançado para esta prova ainda.
              </p>
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
        description="Ao publicar, a prova já realizada passa a ter o ranking e as medalhas oficiais, e os tempos ficam travados para edição. Deseja continuar?"
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
