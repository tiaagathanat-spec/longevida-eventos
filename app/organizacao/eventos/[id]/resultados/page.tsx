"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Timer, Check } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { usePublicacoes } from "@/lib/mock/publicacoes-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { ShieldAlert } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LancarResultadosPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao, lancar } = useResultados();
  const { estaPublicado } = usePublicacoes();
  const { obterPorInscricao: obterDorsal } = useDorsais();

  const evento = obterEvento(eventoId);
  const provasDoEvento = useMemo(
    () => provas.filter((p) => p.eventoId === eventoId),
    [provas, eventoId]
  );

  const [provaId, setProvaId] = useState(provasDoEvento[0]?.id ?? "");

  const inscritosDaProva = useMemo(
    () =>
      inscricoes.filter(
        (i) => i.provaId === provaId && i.status === "confirmada"
      ),
    [inscricoes, provaId]
  );

  const [tempos, setTempos] = useState<Record<string, string>>({});
  const [salvos, setSalvos] = useState<Record<string, boolean>>({});
  const provaPublicada = provaId ? estaPublicado(provaId) : false;

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  function handleSalvar(inscricaoId: string) {
    const tempo = tempos[inscricaoId] ?? obterPorInscricao(inscricaoId)?.tempo ?? "";
    if (!tempo.trim()) return;
    lancar(inscricaoId, tempo.trim());
    setSalvos((atual) => ({ ...atual, [inscricaoId]: true }));
    setTimeout(() => {
      setSalvos((atual) => ({ ...atual, [inscricaoId]: false }));
    }, 1500);
  }

  // O tempo só pode ser lançado após check-in + retirada do kit no dia
  // do evento (controles da tela de Inscritos/Check-in).
  function estaLiberado(inscricaoId: string) {
    const dorsal = obterDorsal(inscricaoId);
    return !!dorsal && dorsal.checkInFeito && dorsal.kitEntregue;
  }

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

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/organizacao/eventos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Eventos
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Lançar resultados
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
        </div>
        <Link
          href={`/organizacao/eventos/${eventoId}/classificacao`}
          className="whitespace-nowrap text-sm font-medium text-brand-green hover:underline"
        >
          Ver classificação
        </Link>
      </header>

      {provaPublicada && (
        <div className="mb-4 rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Os resultados desta prova já foram publicados. Para corrigir um tempo, despublique
          primeiro na tela de Classificação.
        </div>
      )}

      {provasDoEvento.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este evento ainda não tem provas cadastradas.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 max-w-sm">
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

          {inscritosDaProva.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum atleta confirmado nesta prova ainda.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {inscritosDaProva.map((inscricao) => {
                const resultadoExistente = obterPorInscricao(inscricao.id);
                const valorAtual = tempos[inscricao.id] ?? resultadoExistente?.tempo ?? "";
                const liberado = estaLiberado(inscricao.id);
                const dorsal = obterDorsal(inscricao.id);

                return (
                  <div
                    key={inscricao.id}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 ${
                      liberado
                        ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                        : "border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-950/20"
                    } sm:flex-row sm:items-center sm:justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-brand-green/10 p-2">
                        <Timer className="h-4 w-4 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {inscricao.atletaNome}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold">
                          {liberado ? (
                            <span className="text-brand-green">Liberado</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-300">
                              <ShieldAlert className="mr-0.5 inline h-3 w-3" />
                              Bloqueado
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 sm:items-end">
                      {!liberado && (
                        <p className="max-w-xs text-[11px] font-medium text-amber-700 dark:text-amber-300">
                          Aguardando{" "}
                          <strong className="font-bold">
                            check-in
                            {dorsal?.checkInFeito ? "" : " (pendente)"}
                          </strong>{" "}
                          e{" "}
                          <strong className="font-bold">
                            kit
                            {dorsal?.kitEntregue ? "" : " (pendente)"}
                          </strong>
                          .
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="mm:ss.cc"
                          value={valorAtual}
                          onChange={(e) =>
                            setTempos((atual) => ({ ...atual, [inscricao.id]: e.target.value }))
                          }
                          disabled={provaPublicada || !liberado}
                          className="w-32"
                        />
                        <Button
                          variant={salvos[inscricao.id] ? "secondary" : "primary"}
                          onClick={() => handleSalvar(inscricao.id)}
                          disabled={provaPublicada || !liberado}
                        >
                          {salvos[inscricao.id] ? <Check className="h-4 w-4" /> : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
