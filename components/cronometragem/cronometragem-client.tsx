"use client";

import { useEffect, useMemo, useState } from "react";
import { Timer, Check, ChevronDown, ShieldAlert } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { useDorsais } from "@/lib/mock/dorsais-store";

// Módulo Cronometragem — pensado para uso rápido em tablet durante a
// competição: campos grandes, poucos toques, salvar imediato por atleta.
// Não modifica o módulo de Lançamento de Resultados existente
// (app/(organizacao)/eventos/[id]/resultados) — é um fluxo paralelo,
// mais direto, sobre a mesma base de dados (resultados-store).
//
// Este componente é 100% idêntico ao que antes vivia direto em
// app/(organizacao)/cronometragem/page.tsx — só foi movido para cá para
// que a rota passasse a ter um Server Component fazendo a checagem de
// autorização antes de renderizar (ver o novo page.tsx). Nenhuma linha
// de lógica ou de UI foi alterada nesta mudança.

export function CronometragemClient() {
  const { eventos } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao, lancar } = useResultados();
  const { obterPorInscricao: obterDorsal } = useDorsais();

  const [eventoId, setEventoId] = useState("");
  const [provaId, setProvaId] = useState("");

  const provasDoEvento = useMemo(
    () => provas.filter((p) => p.eventoId === eventoId),
    [provas, eventoId]
  );

  // Ao trocar de evento, seleciona a primeira prova dele automaticamente.
  useEffect(() => {
    if (!eventoId) {
      setProvaId("");
      return;
    }
    const primeira = provas.find((p) => p.eventoId === eventoId);
    setProvaId(primeira?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId]);

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  const atletasDaProva = useMemo(
    () =>
      inscricoes
        .filter((i) => i.provaId === provaId && i.status === "confirmada")
        .sort((a, b) => {
          const pa = Number(a.numeroPeito) || 9999;
          const pb = Number(b.numeroPeito) || 9999;
          return pa - pb;
        }),
    [inscricoes, provaId]
  );

  const [rascunhos, setRascunhos] = useState<Record<string, { tempo: string; observacao: string }>>(
    {}
  );
  const [salvosAgora, setSalvosAgora] = useState<Record<string, boolean>>({});

  function valorTempo(inscricaoId: string) {
    return rascunhos[inscricaoId]?.tempo ?? obterPorInscricao(inscricaoId)?.tempo ?? "";
  }
  function valorObservacao(inscricaoId: string) {
    return rascunhos[inscricaoId]?.observacao ?? obterPorInscricao(inscricaoId)?.observacao ?? "";
  }

  function handleSalvar(inscricaoId: string) {
    const tempo = valorTempo(inscricaoId);
    if (!tempo.trim()) return;
    lancar(inscricaoId, tempo.trim(), valorObservacao(inscricaoId).trim());
    setSalvosAgora((atual) => ({ ...atual, [inscricaoId]: true }));
    setTimeout(() => setSalvosAgora((atual) => ({ ...atual, [inscricaoId]: false })), 1200);
  }

  // O tempo do atleta só pode ser lançado depois que ele fez check-in e
  // retirou o kit no dia do evento (controles marcados na tela de
  // Inscritos/Check-in). Antes disso, o lançamento fica bloqueado.
  function estaLiberado(inscricaoId: string) {
    const dorsal = obterDorsal(inscricaoId);
    return !!dorsal && dorsal.checkInFeito && dorsal.kitEntregue;
  }

  const provaSelecionada = provas.find((p) => p.id === provaId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-brand-green/10 p-2.5">
          <Timer className="h-6 w-6 text-brand-green" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Cronometragem
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Lançamento rápido de tempos durante a competição.
          </p>
        </div>
      </header>

      {/* Seletores — grandes, pensados para toque */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative">
          <select
            value={eventoId}
            onChange={(e) => setEventoId(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-medium text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">Selecione o evento</option>
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={provaId}
            onChange={(e) => setProvaId(e.target.value)}
            disabled={!eventoId || provasDoEvento.length === 0}
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-medium text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {provasDoEvento.length === 0 ? (
              <option value="">Nenhuma prova neste evento</option>
            ) : (
              provasDoEvento.map((p) => (
                <option key={p.id} value={p.id}>
                  {nomeModalidade(p.modalidadeId)} · {nomeCategoria(p.categoriaId)}
                  {p.horario ? ` · ${p.horario}` : ""}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {!eventoId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Selecione um evento para começar.
          </p>
        </div>
      ) : !provaSelecionada ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este evento ainda não tem provas cadastradas.
          </p>
        </div>
      ) : atletasDaProva.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum atleta confirmado nesta prova ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {atletasDaProva.map((inscricao) => {
            const salvo = salvosAgora[inscricao.id];
            const liberado = estaLiberado(inscricao.id);
            const dorsal = obterDorsal(inscricao.id);
            return (
              <div
                key={inscricao.id}
                className={`rounded-2xl border p-4 ${
                  liberado
                    ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                    : "border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-950/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {inscricao.numeroPeito || "—"}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900 dark:text-white">
                    {inscricao.atletaNome}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      liberado
                        ? "bg-brand-green/10 text-brand-green"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                    }`}
                  >
                    {liberado ? "Liberado" : "Bloqueado"}
                  </span>
                </div>

                {!liberado && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-xs font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-300">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Cronometragem bloqueada. O atleta precisa de{" "}
                      <strong className="font-bold">
                        check-in
                        {dorsal?.checkInFeito ? "" : " (pendente)"}
                      </strong>{" "}
                      e{" "}
                      <strong className="font-bold">
                        retirada do kit
                        {dorsal?.kitEntregue ? "" : " (pendente)"}
                      </strong>{" "}
                      para liberar o lançamento do tempo.
                    </span>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="mm:ss.cc"
                    value={valorTempo(inscricao.id)}
                    disabled={!liberado}
                    onChange={(e) =>
                      setRascunhos((atual) => ({
                        ...atual,
                        [inscricao.id]: {
                          tempo: e.target.value,
                          observacao: valorObservacao(inscricao.id),
                        },
                      }))
                    }
                    className="w-full flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-lg font-semibold tabular-nums text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleSalvar(inscricao.id)}
                    disabled={!liberado}
                    aria-label={`Salvar tempo de ${inscricao.atletaNome}`}
                    className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      salvo ? "bg-brand-green" : "bg-brand-blue hover:bg-brand-blue-dark"
                    }`}
                  >
                    <Check className="h-6 w-6" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Observação (opcional) — ex: largada tardia, WO, DQ"
                  value={valorObservacao(inscricao.id)}
                  disabled={!liberado}
                  onChange={(e) =>
                    setRascunhos((atual) => ({
                      ...atual,
                      [inscricao.id]: {
                        tempo: valorTempo(inscricao.id),
                        observacao: e.target.value,
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-transparent bg-slate-50 px-4 py-2.5 text-sm text-slate-600 outline-none focus:border-slate-200 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-300 dark:focus:border-slate-700"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
