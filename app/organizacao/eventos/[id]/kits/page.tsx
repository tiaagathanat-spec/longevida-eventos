"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, CheckCircle2, Clock3 } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useDorsais } from "@/lib/mock/dorsais-store";

export default function OrganizacaoKitsPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao, atualizarControles } = useDorsais();

  const evento = obterEvento(eventoId);

  const inscritos = useMemo(() => {
    return inscricoes
      .filter((i) => i.eventoId === eventoId && i.status === "confirmada")
      .map((inscricao) => {
        const prova = provas.find((p) => p.id === inscricao.provaId);
        const dorsal = obterPorInscricao(inscricao.id);
        return { inscricao, prova, dorsal };
      })
      .sort((a, b) => (a.dorsal?.numero ?? 9999) - (b.dorsal?.numero ?? 9999));
  }, [inscricoes, provas, eventoId, obterPorInscricao]);

  const entregues = inscritos.filter((i) => i.dorsal?.kitEntregue).length;

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  if (!evento) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
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
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href={`/organizacao/eventos/${eventoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o evento
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Entrega de kits</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
      </header>

      {/* Contadores de produção/entrega */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Kits a produzir
            </span>
            <div className="rounded-xl bg-brand-blue/10 p-2">
              <Package className="h-4 w-4 text-brand-blue" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
            {inscritos.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Kits entregues
            </span>
            <div className="rounded-xl bg-brand-green/10 p-2">
              <CheckCircle2 className="h-4 w-4 text-brand-green" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{entregues}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Restantes
            </span>
            <div className="rounded-xl bg-amber-100 p-2">
              <Clock3 className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
            {inscritos.length - entregues}
          </p>
        </div>
      </div>

      {inscritos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma inscrição confirmada para este evento.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Peito</th>
                <th className="px-4 py-3 font-medium">Atleta</th>
                <th className="px-4 py-3 font-medium">Prova</th>
                <th className="px-4 py-3 font-medium">Kit entregue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {inscritos.map(({ inscricao, prova, dorsal }) => (
                <tr key={inscricao.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    {dorsal ? String(dorsal.numero).padStart(3, "0") : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {inscricao.atletaNome}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {prova
                      ? `${nomeModalidade(prova.modalidadeId)} · ${nomeCategoria(prova.categoriaId)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={dorsal?.kitEntregue ?? false}
                      onChange={(e) =>
                        atualizarControles(inscricao.id, { kitEntregue: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green/30"
                    />
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
