"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Waves, ListChecks, Users, Plus } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useProvas } from "@/lib/mock/provas-store";
import {
  useModalidades,
  Modalidade,
  Estilo,
} from "@/lib/mock/modalidades-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";

const ESTILO_LABEL: Record<Estilo, string> = {
  livre: "Livre",
  costas: "Costas",
  peito: "Peito",
  borboleta: "Borboleta",
  medley: "Medley",
};

function nomeEstilo(modalidade: Modalidade) {
  const partes = [ESTILO_LABEL[modalidade.estilo]];
  if (modalidade.distanciaMetros) partes.push(`${modalidade.distanciaMetros}m`);
  return partes.join(" · ");
}

// Tela: Modalidades do Evento.
//
// Mostra quais modalidades são usadas nas provas deste evento e quantas
// provas/inscritos há em cada uma. A definição das modalidades (estilos
// e distâncias) é global e fica em /admin/modalidades.

export default function ModalidadesDoEventoPage() {
  const params = useParams<{ id: string }>();
  const { obterPorId: obterEvento } = useEventos();
  const { listarPorEvento } = useProvas();
  const { modalidades } = useModalidades();
  const { inscricoes } = useInscricoes();

  const evento = obterEvento(params.id);
  const provasDoEvento = useMemo(() => listarPorEvento(params.id), [listarPorEvento, params.id]);

  const usos = useMemo(() => {
    return modalidades
      .map((modalidade) => {
        const provasDaModalidade = provasDoEvento.filter(
          (p) => p.modalidadeId === modalidade.id
        );
        const inscritos = inscricoes.filter(
          (i) =>
            i.status === "confirmada" &&
            i.eventoId === params.id &&
            provasDaModalidade.some((p) => p.id === i.provaId)
        ).length;
        return {
          modalidade,
          provas: provasDaModalidade.length,
          inscritos,
        };
      })
      .filter((u) => u.provas > 0)
      .sort((a, b) => b.provas - a.provas);
  }, [modalidades, provasDoEvento, inscricoes, params.id]);

  if (!evento) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/admin/eventos/${evento.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para {evento.nome}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Modalidades do evento
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Modalidades usadas nas provas de {evento.nome}.
          </p>
        </div>
        <Link
          href="/admin/modalidades"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue/10 px-3 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue/15"
        >
          <Plus className="h-4 w-4" />
          Gerenciar modalidades
        </Link>
      </div>

      {usos.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
          <Waves className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Nenhuma modalidade em uso. Cadastre as provas do evento em{" "}
            <Link href={`/admin/eventos/${evento.id}/provas`} className="font-medium text-brand-blue hover:underline">
              Provas
            </Link>{" "}
            para definir quais modalidades participam.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">
                  Modalidade
                </th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">
                  Descrição
                </th>
                <th className="px-5 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="h-3.5 w-3.5" />
                    Provas
                  </span>
                </th>
                <th className="px-5 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Inscritos
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usos.map(({ modalidade, provas: totalProvas, inscritos }) => (
                <tr key={modalidade.id}>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">
                        {modalidade.nome}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {nomeEstilo(modalidade)}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                    {modalidade.descricao}
                  </td>
                  <td className="px-5 py-3 text-center font-medium text-slate-900 dark:text-white">
                    {totalProvas}
                  </td>
                  <td className="px-5 py-3 text-center font-medium text-slate-900 dark:text-white">
                    {inscritos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
