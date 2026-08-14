"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Flag,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  Timer,
  WifiOff,
  X,
} from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { useQrCodes } from "@/lib/mock/qrcodes-store";
import { useSessao } from "@/lib/mock/sessao";
import { usePendentesOffline } from "@/lib/supabase/fila-offline";
import { processarFilaOffline } from "@/lib/supabase/persistencia";

// Módulo Cronometragem — pensado para uso rápido em tablet durante a
// competição: campos grandes, poucos toques, salvar imediato por atleta.
// Não modifica o módulo de Lançamento de Resultados existente
// (app/(organizacao)/eventos/[id]/resultados) — é um fluxo paralelo,
// mais direto, sobre a mesma base de dados (resultados-store).
//
// Dois modos de trabalho:
//  1) "Cronômetro de chegada" — cronômetro oficial ÚNICO e CONTÍNUO por
//     prova (itens 20/21): inicia uma vez, nunca para de contar enquanto
//     atletas cruzam a chegada. Cada toque em "Capturar chegada" congela
//     o instante, e o cronometrista identifica o atleta (nome, número ou
//     QR) com UM toque — o cronômetro continua rodando, então o próximo
//     atleta já está disponível imediatamente (fluxo contínuo, item 26).
//     Todo tempo registrado guarda quem (cronometrista), quando
//     (capturadoEm) e o estado anterior (tempoAnterior) — auditoria.
//  2) "Lançamento manual" — edição direta do tempo de cada atleta na
//     lista (mantido idêntico ao fluxo original).
//
// A captura roda 100% no cliente (performance.now()), sem depender da
// rede (resiliência de conexão, item 25).

function formatarTempo(ms: number): string {
  const totalCent = Math.floor(ms / 10);
  const min = Math.floor(totalCent / 6000);
  const seg = Math.floor((totalCent % 6000) / 100);
  const cent = totalCent % 100;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}.${String(
    cent
  ).padStart(2, "0")}`;
}

type Modo = "cronometro" | "manual";

type FlashSalvo = { inscricaoId: string; nome: string; tempo: string };

export function CronometragemClient() {
  const { eventos } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { resultados, obterPorInscricao, lancar, remover } = useResultados();
  const { obterPorInscricao: obterDorsal } = useDorsais();
  const { qrCodes } = useQrCodes();
  const { sessao } = useSessao();

  const [modo, setModo] = useState<Modo>("cronometro");
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

  // ------------------------------------------------------------------
  // Cronômetro oficial único e contínuo
  // ------------------------------------------------------------------
  const [cronometrista, setCronometrista] = useState("");
  useEffect(() => {
    if (!cronometrista && sessao.nome) setCronometrista(sessao.nome);
  }, [cronometrista, sessao.nome]);

  const [inicio, setInicio] = useState<number | null>(null);
  const [rodando, setRodando] = useState(false);
  const [agora, setAgora] = useState(0);
  const [pausadoMs, setPausadoMs] = useState(0);
  const [capturando, setCapturando] = useState(false);
  const [capturaMs, setCapturaMs] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [salvoFlash, setSalvoFlash] = useState<FlashSalvo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Conectividade + fila offline: a captura segue funcionando sem rede e o
  // banner avisa que há chegadas aguardando sincronização.
  const pendentes = usePendentesOffline("app_resultados");
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  useEffect(() => {
    const aoFicarOnline = () => setOnline(true);
    const aoFicarOffline = () => setOnline(false);
    window.addEventListener("online", aoFicarOnline);
    window.addEventListener("offline", aoFicarOffline);
    return () => {
      window.removeEventListener("online", aoFicarOnline);
      window.removeEventListener("offline", aoFicarOffline);
    };
  }, []);

  // O cronômetro roda com referência em performance.now() (nunca soma
  // incrementos), então não acumula erro mesmo com o tab desfocado.
  useEffect(() => {
    if (!rodando || inicio == null) return;
    const id = setInterval(() => setAgora(performance.now() - inicio), 50);
    return () => clearInterval(id);
  }, [rodando, inicio]);

  // Ao trocar de prova, zera o cronômetro para não misturar largadas.
  useEffect(() => {
    setRodando(false);
    setInicio(null);
    setAgora(0);
    setPausadoMs(0);
    setCapturando(false);
    setCapturaMs(null);
    setBusca("");
    setSalvoFlash(null);
    setErro(null);
  }, [provaId]);

  const tempoExibido = rodando ? agora : pausadoMs;

  function iniciar() {
    setInicio(performance.now());
    setAgora(0);
    setPausadoMs(0);
    setRodando(true);
    setCapturando(false);
    setCapturaMs(null);
    setBusca("");
    setErro(null);
  }
  function pausar() {
    if (inicio == null) return;
    setPausadoMs(performance.now() - inicio);
    setRodando(false);
  }
  function retomar() {
    const base = pausadoMs;
    setInicio(performance.now() - base);
    setAgora(base);
    setRodando(true);
  }
  function reiniciar() {
    setRodando(false);
    setInicio(null);
    setAgora(0);
    setPausadoMs(0);
    setCapturando(false);
    setCapturaMs(null);
    setBusca("");
    setSalvoFlash(null);
    setErro(null);
  }

  // Captura o instante atual SEM parar o cronômetro oficial: o próximo
  // atleta já pode ser capturado enquanto o atual é identificado.
  function capturarChegada() {
    if (!rodando || inicio == null) return;
    setCapturaMs(performance.now() - inicio);
    setCapturando(true);
    setBusca("");
    setSalvoFlash(null);
    setErro(null);
  }

  // O tempo do atleta só pode ser lançado depois que ele fez check-in e
  // retirou o kit no dia do evento (controles marcados na tela de
  // Inscritos/Check-in). Antes disso, o lançamento fica bloqueado.
  function estaLiberado(inscricaoId: string) {
    const dorsal = obterDorsal(inscricaoId);
    return !!dorsal && dorsal.checkInFeito && dorsal.kitEntregue;
  }

  // Busca por nome, número do peito/dorsal ou identificador do QR.
  const candidatos = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return [];
    const viaQr = qrCodes.find((x) => x.identificador.toLowerCase() === q);
    return atletasDaProva.filter((ins) => {
      if (viaQr && viaQr.inscricaoId === ins.id) return true;
      if (ins.atletaNome.toLowerCase().includes(q)) return true;
      if (ins.numeroPeito && ins.numeroPeito.trim().toLowerCase() === q) return true;
      const dorsal = obterDorsal(ins.id);
      if (dorsal && String(dorsal.numero).toLowerCase() === q) return true;
      return false;
    });
  }, [busca, atletasDaProva, qrCodes, obterDorsal]);

  // Confirma a captura com UM toque no atleta (desempenho, item 27) e
  // volta imediatamente para o estado "próximo atleta" (fluxo contínuo).
  function gravarCaptura(inscricaoId: string) {
    if (capturaMs == null) return;
    const inscricao = inscricoes.find((i) => i.id === inscricaoId);
    if (!estaLiberado(inscricaoId)) {
      setErro(
        `"${inscricao?.atletaNome ?? "Atleta"}" ainda não está liberado (check-in e kit pendentes).`
      );
      return;
    }
    const tempo = formatarTempo(capturaMs);
    lancar(inscricaoId, tempo, "", cronometrista.trim() || undefined);
    setSalvoFlash({
      inscricaoId,
      nome: inscricao?.atletaNome ?? "Atleta",
      tempo,
    });
    setCapturando(false);
    setCapturaMs(null);
    setBusca("");
    setErro(null);
    setTimeout(() => setSalvoFlash(null), 2500);
  }

  function desfazerUltima(inscricaoId: string) {
    remover(inscricaoId);
    setSalvoFlash(null);
  }

  function cancelarCaptura() {
    setCapturando(false);
    setCapturaMs(null);
    setBusca("");
    setErro(null);
  }

  // Histórico das capturas da prova selecionada (para conferência).
  const capturasDaProva = useMemo(
    () =>
      resultados
        .filter((r) => {
          const ins = inscricoes.find((i) => i.id === r.inscricaoId);
          return ins && ins.provaId === provaId;
        })
        .map((r) => ({
          r,
          ins: inscricoes.find((i) => i.id === r.inscricaoId)!,
        }))
        .sort((a, b) => (a.r.capturadoEm ?? "").localeCompare(b.r.capturadoEm ?? "")),
    [resultados, inscricoes, provaId]
  );

  // ------------------------------------------------------------------
  // Lançamento manual (fluxo original preservado)
  // ------------------------------------------------------------------
  const [rascunhos, setRascunhos] = useState<
    Record<string, { tempo: string; observacao: string }>
  >({});
  const [salvosAgora, setSalvosAgora] = useState<Record<string, boolean>>({});

  function valorTempo(inscricaoId: string) {
    return rascunhos[inscricaoId]?.tempo ?? obterPorInscricao(inscricaoId)?.tempo ?? "";
  }
  function valorObservacao(inscricaoId: string) {
    return (
      rascunhos[inscricaoId]?.observacao ??
      obterPorInscricao(inscricaoId)?.observacao ??
      ""
    );
  }

  function handleSalvar(inscricaoId: string) {
    const tempo = valorTempo(inscricaoId);
    if (!tempo.trim()) return;
    lancar(
      inscricaoId,
      tempo.trim(),
      valorObservacao(inscricaoId).trim(),
      cronometrista.trim() || undefined
    );
    setSalvosAgora((atual) => ({ ...atual, [inscricaoId]: true }));
    setTimeout(() => setSalvosAgora((atual) => ({ ...atual, [inscricaoId]: false })), 1200);
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

      {/* Aviso de conectividade / pendências de sincronização */}
      {(!online || pendentes > 0) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-950/30">
          <div className="flex items-start gap-2.5">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {online
                  ? `${pendentes} marcação(ões) aguardando sincronização`
                  : "Você está offline"}
              </p>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/80">
                As chegadas continuam sendo capturadas localmente, com o
                tempo original de cada uma, e serão sincronizadas quando a
                conexão voltar.
              </p>
            </div>
          </div>
          {pendentes > 0 && (
            <button
              type="button"
              onClick={() => processarFilaOffline()}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Sincronizar agora
            </button>
          )}
        </div>
      )}

      {/* Seletor de modo */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setModo("cronometro")}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            modo === "cronometro"
              ? "bg-white text-brand-green shadow-sm dark:bg-slate-800 dark:text-brand-green"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Flag className="mr-1.5 inline h-4 w-4" />
          Cronômetro de chegada
        </button>
        <button
          type="button"
          onClick={() => setModo("manual")}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            modo === "manual"
              ? "bg-white text-brand-green shadow-sm dark:bg-slate-800 dark:text-brand-green"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Timer className="mr-1.5 inline h-4 w-4" />
          Lançamento manual
        </button>
      </div>

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
      ) : modo === "cronometro" ? (
        <CronometroSection
          cronometrista={cronometrista}
          setCronometrista={setCronometrista}
          tempoExibido={tempoExibido}
          rodando={rodando}
          inicio={inicio}
          iniciar={iniciar}
          pausar={pausar}
          retomar={retomar}
          reiniciar={reiniciar}
          capturando={capturando}
          capturaMs={capturaMs}
          capturarChegada={capturarChegada}
          cancelarCaptura={cancelarCaptura}
          busca={busca}
          setBusca={setBusca}
          candidatos={candidatos}
          estaLiberado={estaLiberado}
          gravarCaptura={gravarCaptura}
          salvoFlash={salvoFlash}
          desfazerUltima={desfazerUltima}
          erro={erro}
          capturasDaProva={capturasDaProva}
          remover={remover}
          formatarTempo={formatarTempo}
        />
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

type CronometroSectionProps = {
  cronometrista: string;
  setCronometrista: (v: string) => void;
  tempoExibido: number;
  rodando: boolean;
  inicio: number | null;
  iniciar: () => void;
  pausar: () => void;
  retomar: () => void;
  reiniciar: () => void;
  capturando: boolean;
  capturaMs: number | null;
  capturarChegada: () => void;
  cancelarCaptura: () => void;
  busca: string;
  setBusca: (v: string) => void;
  candidatos: ReturnType<typeof useInscricoes>["inscricoes"];
  estaLiberado: (inscricaoId: string) => boolean;
  gravarCaptura: (inscricaoId: string) => void;
  salvoFlash: FlashSalvo | null;
  desfazerUltima: (inscricaoId: string) => void;
  erro: string | null;
  capturasDaProva: {
    r: {
      inscricaoId: string;
      tempo: string;
      cronometrista?: string;
      capturadoEm?: string;
      tempoAnterior?: string;
    };
    ins: { id: string; atletaNome: string; numeroPeito?: string };
  }[];
  remover: (inscricaoId: string) => void;
  formatarTempo: (ms: number) => string;
};

function CronometroSection(props: CronometroSectionProps) {
  const {
    cronometrista,
    setCronometrista,
    tempoExibido,
    rodando,
    inicio,
    iniciar,
    pausar,
    retomar,
    reiniciar,
    capturando,
    capturaMs,
    capturarChegada,
    cancelarCaptura,
    busca,
    setBusca,
    candidatos,
    estaLiberado,
    gravarCaptura,
    salvoFlash,
    desfazerUltima,
    erro,
    capturasDaProva,
    remover,
    formatarTempo,
  } = props;

  const temCapturaPendente = capturando && capturaMs != null;

  return (
    <div className="flex flex-col gap-4">
      {/* Cronometrista responsável (item 22) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <label
          htmlFor="cronometrista"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Cronometrista responsável
        </label>
        <input
          id="cronometrista"
          type="text"
          value={cronometrista}
          onChange={(e) => setCronometrista(e.target.value)}
          placeholder="Seu nome — registrado em cada tempo lançado"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          O cronômetro é único e contínuo: inicie na largada e não pare
          enquanto atletas cruzarem a chegada.
        </p>
      </div>

      {/* Mostrador do cronômetro oficial */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-950">
        <div className="text-6xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white sm:text-7xl">
          {formatarTempo(tempoExibido)}
        </div>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          {rodando
            ? "Cronômetro oficial rodando — capturas liberadas"
            : inicio == null
            ? "Cronômetro parado"
            : "Cronômetro pausado"}
        </p>
      </div>

      {/* Controles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {inicio == null ? (
          <button
            type="button"
            onClick={iniciar}
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand-green px-4 py-4 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark sm:col-span-1"
          >
            <Play className="h-5 w-5" />
            Iniciar
          </button>
        ) : rodando ? (
          <button
            type="button"
            onClick={pausar}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-200 px-4 py-4 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Pause className="h-5 w-5" />
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={retomar}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-200 px-4 py-4 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Play className="h-5 w-5" />
            Retomar
          </button>
        )}

        <button
          type="button"
          onClick={reiniciar}
          disabled={inicio == null}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-200 px-4 py-4 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RotateCcw className="h-5 w-5" />
          Zerar
        </button>

        <button
          type="button"
          onClick={capturarChegada}
          disabled={!rodando}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-4 text-base font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2"
        >
          <Flag className="h-5 w-5" />
          Capturar chegada
        </button>
      </div>

      {/* Feedback de tempo salvo */}
      {salvoFlash && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-green/40 bg-brand-green/10 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Check className="h-5 w-5 shrink-0 text-brand-green" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {salvoFlash.nome} — <strong className="tabular-nums">{salvoFlash.tempo}</strong>{" "}
              registrado
            </p>
          </div>
          <button
            type="button"
            onClick={() => desfazerUltima(salvoFlash.inscricaoId)}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Desfazer
          </button>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-300">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          {erro}
        </div>
      )}

      {/* Identificação do atleta capturado — o cronômetro continua rodando */}
      {temCapturaPendente ? (
        <div className="rounded-2xl border border-brand-green/40 bg-brand-green/5 p-4 dark:border-brand-green/30 dark:bg-brand-green/10">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Chegada capturada:{" "}
              <span className="ml-1 text-3xl font-bold tabular-nums text-brand-green">
                {formatarTempo(capturaMs!)}
              </span>
            </p>
            <button
              type="button"
              onClick={cancelarCaptura}
              aria-label="Cancelar captura"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Toque no atleta para confirmar. Você também pode colar o QR da
            inscrição. O cronômetro segue rodando — o próximo atleta já está
            disponível.
          </p>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, número ou QR..."
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base font-medium text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {busca.trim() && candidatos.length === 0 && (
            <p className="mt-3 text-sm font-medium text-amber-600 dark:text-amber-400">
              Nenhum atleta encontrado para essa busca.
            </p>
          )}

          {busca.trim() && candidatos.length > 0 && (
            <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-auto">
              {candidatos.map((inscricao) => {
                const liberado = estaLiberado(inscricao.id);
                return (
                  <button
                    type="button"
                    key={inscricao.id}
                    onClick={() => gravarCaptura(inscricao.id)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                      liberado
                        ? "border-slate-200 bg-white hover:border-brand-green hover:bg-brand-green/5 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-green"
                        : "border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-950/20"
                    }`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {inscricao.numeroPeito || "—"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900 dark:text-white">
                      {inscricao.atletaNome}
                    </span>
                    {liberado ? (
                      <span className="shrink-0 rounded-full bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green">
                        Confirmar
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        Bloqueado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {rodando
              ? "Toque em “Capturar chegada” quando um atleta cruzar a linha."
              : "Inicie o cronômetro na largada para liberar a captura de chegadas."}
          </p>
        </div>
      )}

      {/* Histórico de capturas da prova */}
      {capturasDaProva.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Tempos registrados nesta prova
          </h2>
          <div className="flex flex-col gap-2">
            {capturasDaProva.map(({ r, ins }) => (
              <div
                key={r.inscricaoId}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="w-10 shrink-0 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                  {ins.numeroPeito || "—"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {ins.atletaNome}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-brand-green">
                  {r.tempo}
                </span>
                <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
                  {r.cronometrista ? r.cronometrista : "—"}
                </span>
                <button
                  type="button"
                  onClick={() => remover(r.inscricaoId)}
                  aria-label={`Remover tempo de ${ins.atletaNome}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 transition-colors hover:text-red-600 dark:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
