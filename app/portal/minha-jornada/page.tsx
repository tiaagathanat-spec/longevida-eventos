"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Trophy, Medal, CalendarDays, Route } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useInscricoes, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { usePublicacoes } from "@/lib/mock/publicacoes-store";
import { classificarPorGrupos } from "@/lib/mock/classificacao-grupos";
import { useSessao } from "@/lib/mock/sessao";

// Medalha por colocação — mesma convenção usada em "Meus resultados".
const MEDALHA: Record<number, string> = {
  1: "text-amber-500",
  2: "text-slate-400",
  3: "text-orange-700",
};

const MEDALHA_LABEL: Record<number, string> = {
  1: "Ouro",
  2: "Prata",
  3: "Bronze",
};

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type EtapaJornada = {
  inscricaoId: string;
  atletaNome: string;
  atletaNome2?: string;
  eventoId: string;
  eventoNome: string;
  eventoData: string;
  local: string;
  modalidade: string;
  categoria: string;
  tempo: string;
  colocacao: number | null;
};

export default function MinhaJornadaPage() {
  const { sessao } = useSessao();
  const { eventos } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { atletas } = useAtletas();
  const { inscricoes } = useInscricoes();
  const { obterPorInscricao } = useResultados();
  const { estaPublicado } = usePublicacoes();

  const meusNomesDeAtletas = useMemo(
    () =>
      new Set(
        atletas
          .filter((a) => a.responsavelNome === sessao.nome)
          .map((a) => a.nome)
      ),
    [atletas, sessao.nome]
  );

  // Inscrições confirmadas dos meus atletas.
  const minhasInscricoes = useMemo(
    () =>
      inscricoes.filter(
        (i) => meusNomesDeAtletas.has(i.atletaNome) && i.status === "confirmada"
      ),
    [inscricoes, meusNomesDeAtletas]
  );

  function nomeModalidade(id?: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id?: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  // Etapas concluídas da jornada: inscrições com resultado publicado e
  // tempo lançado, com a colocação recalculada entre todos os confirmados
  // da mesma prova (mesma lógica de "Meus resultados").
  const etapas = useMemo<EtapaJornada[]>(() => {
    const comTempo = minhasInscricoes
      .map((inscricao) => {
        const prova = provas.find((p) => p.id === inscricao.provaId);
        const evento = eventos.find((e) => e.id === inscricao.eventoId);
        const tempo = obterPorInscricao(inscricao.id)?.tempo ?? "";
        return { inscricao, prova, evento, tempo };
      })
      .filter(
        (r) =>
          r.tempo.trim() !== "" &&
          r.prova !== undefined &&
          r.evento !== undefined &&
          estaPublicado(r.inscricao.provaId)
      );

    // Colocação recalculada por prova, dividida por grupo (categoria ·
    // idade · sexo) — o pódio/medalha é dentro do grupo do atleta.
    const colocacoes = new Map<string, number>();
    const provasDistintas = [...new Set(comTempo.map((r) => r.inscricao.provaId))];
    provasDistintas.forEach((provaId) => {
      const provaDaLista = provas.find((p) => p.id === provaId);
      const todosDaProva = inscricoes
        .filter((o) => o.provaId === provaId && o.status === "confirmada")
        .map((o) => ({
          item: o,
          tempo: obterPorInscricao(o.id)?.tempo ?? "",
          atleta: atletas.find((a) => a.nome === o.atletaNome),
          categoria: provaDaLista
            ? categorias.find((c) => c.id === provaDaLista.categoriaId)
            : undefined,
        }))
        .filter((o) => o.tempo.trim() !== "");
      classificarPorGrupos(todosDaProva).forEach((grupo) => {
        grupo.classificacao.forEach(({ item, colocacao }) => {
          colocacoes.set(item.id, colocacao);
        });
      });
    });

    return comTempo
      .map(({ inscricao, prova, evento, tempo }) => ({
        inscricaoId: inscricao.id,
        atletaNome: inscricao.atletaNome,
        atletaNome2: inscricao.atletaNome2,
        eventoId: evento!.id,
        eventoNome: evento!.nome,
        eventoData: evento!.data,
        local: evento!.local,
        modalidade: nomeModalidade(prova!.modalidadeId),
        categoria: nomeCategoria(prova!.categoriaId),
        tempo,
        colocacao: colocacoes.get(inscricao.id) ?? null,
      }))
      .sort((a, b) => a.eventoData.localeCompare(b.eventoData));
  }, [
    minhasInscricoes,
    inscricoes,
    provas,
    eventos,
    atletas,
    categorias,
    obterPorInscricao,
    estaPublicado,
    nomeModalidade,
    nomeCategoria,
  ]);

  // Próximos desafios: inscrições confirmadas cujo resultado ainda não
  // foi publicado (evento por acontecer ou resultado em processo).
  const proximosDesafios = useMemo(
    () =>
      minhasInscricoes
        .filter((i) => !estaPublicado(i.provaId))
        .map((inscricao) => {
          const prova = provas.find((p) => p.id === inscricao.provaId);
          const evento = eventos.find((e) => e.id === inscricao.eventoId);
          return {
            inscricaoId: inscricao.id,
            atletaNome: inscricao.atletaNome,
            atletaNome2: inscricao.atletaNome2,
            eventoId: inscricao.eventoId,
            eventoNome: evento?.nome ?? "—",
            eventoData: evento?.data ?? "",
            local: evento?.local ?? "—",
            modalidade: nomeModalidade(prova?.modalidadeId),
            categoria: nomeCategoria(prova?.categoriaId),
          };
        })
        .sort((a, b) => a.eventoData.localeCompare(b.eventoData)),
    [minhasInscricoes, estaPublicado, provas, eventos, nomeModalidade, nomeCategoria]
  );

  const pódios = etapas.filter((e) => e.colocacao !== null && e.colocacao <= 3);
  const medalhas = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
  pódios.forEach((e) => {
    if (e.colocacao && medalhas[e.colocacao] !== undefined) medalhas[e.colocacao] += 1;
  });

  const KPIS = [
    {
      label: "Provas disputadas",
      value: String(etapas.length),
      icon: CalendarDays,
    },
    {
      label: "Pódios",
      value: String(pódios.length),
      icon: Trophy,
    },
    {
      label: "Medalhas de ouro",
      value: String(medalhas[1]),
      icon: Medal,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Minha Jornada
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          O histórico esportivo dos seus atletas: provas disputadas, pódios e o que vem por aí.
        </p>
      </header>

      {/* Resumo da jornada */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {KPIS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <div className="rounded-xl bg-brand-blue/10 p-2">
                <Icon className="h-4 w-4 text-brand-blue" strokeWidth={2} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </section>

      {/* Linha do tempo */}
      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
          Linha do tempo
        </h2>

        {etapas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
            <Route className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Sua jornada começa aqui. Quando os resultados forem publicados, eles
              aparecem nesta linha do tempo.
            </p>
            <Link
              href="/portal/eventos"
              className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline"
            >
              Ver eventos disponíveis
            </Link>
          </div>
        ) : (
          <div className="relative flex flex-col gap-4 pl-6">
            <div
              aria-hidden
              className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-200 dark:bg-slate-800"
            />
            {etapas.map((etapa) => (
              <div key={etapa.inscricaoId} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-6 top-5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white ${
                    etapa.colocacao && etapa.colocacao <= 3
                      ? "bg-amber-400"
                      : "bg-brand-blue"
                  } dark:border-slate-950`}
                />
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          etapa.colocacao && etapa.colocacao <= 3
                            ? `${MEDALHA[etapa.colocacao]} bg-current/10`
                            : "bg-brand-blue/10 text-brand-blue"
                        }`}
                      >
                        <Medal className="h-[18px] w-[18px]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {nomeDaInscricao(etapa)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {etapa.eventoNome} · {etapa.modalidade} · {etapa.categoria}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {etapa.tempo}
                      </p>
                      {etapa.colocacao && etapa.colocacao <= 3 ? (
                        <p className={`text-xs font-medium ${MEDALHA[etapa.colocacao]}`}>
                          {etapa.colocacao}º lugar · {MEDALHA_LABEL[etapa.colocacao]}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {etapa.colocacao ? `${etapa.colocacao}º lugar` : "Resultado"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatarData(etapa.eventoData)}
                    </span>
                    <span>{etapa.local}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Próximos desafios */}
      {proximosDesafios.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Próximos desafios
          </h2>
          <div className="flex flex-col gap-3">
            {proximosDesafios.map((desafio) => (
              <div
                key={desafio.inscricaoId}
                className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-950"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {nomeDaInscricao(desafio)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {desafio.eventoNome} · {desafio.modalidade} · {desafio.categoria}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {desafio.eventoData ? formatarData(desafio.eventoData) : "Em breve"} ·{" "}
                    {desafio.local}
                  </p>
                </div>
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  Confirmada
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
