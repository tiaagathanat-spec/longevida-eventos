"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ListChecks, Timer } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useTiposProva } from "@/lib/mock/tipos-prova-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";

export default function OrganizacaoProvasPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { tiposProva } = useTiposProva();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();

  const evento = obterEvento(eventoId);
  const provasDoEvento = useMemo(
    () => provas.filter((p) => p.eventoId === eventoId),
    [provas, eventoId]
  );

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }
  function nomeTipoProva(id: string) {
    return tiposProva.find((t) => t.id === id)?.nome ?? "—";
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link
          href="/organizacao/eventos"
          className="mt-4 inline-block text-sm font-medium text-brand-green hover:underline"
        >
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/organizacao/eventos/${eventoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o evento
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Provas</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
      </header>

      {provasDoEvento.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este evento ainda não tem provas cadastradas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {provasDoEvento.map((prova) => {
            const inscritos = inscricoes.filter(
              (i) => i.provaId === prova.id && i.status === "confirmada"
            );
            return (
              <Link
                key={prova.id}
                href={`/organizacao/eventos/${eventoId}/resultados`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-green/50 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-brand-blue/10 p-2">
                    <ListChecks className="h-4 w-4 text-brand-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {nomeModalidade(prova.modalidadeId)} · {nomeCategoria(prova.categoriaId)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {nomeTipoProva(prova.tipoProvaId)}
                      {prova.horario ? ` · ${prova.horario}` : ""} · {inscritos.length} inscrito
                      {inscritos.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-brand-green">
                  <Timer className="h-3.5 w-3.5" />
                  Lançar resultados
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
