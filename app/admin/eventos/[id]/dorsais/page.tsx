"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Hash, Image as ImageIcon, Printer, Settings2 } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import {
  useFaixasNumeracao,
  COR_FAIXA_HEX,
  COR_FAIXA_LABEL,
  FAIXAS_ETARIAS,
  CriterioNumeracao,
  resolverGrupoNumeracao,
} from "@/lib/mock/faixas-numeracao-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import { useGaleria } from "@/lib/mock/galeria-store";
import { Button } from "@/components/ui/button";
import { EditarFaixaModal, FaixaEmEdicao } from "@/components/dorsais/editar-faixa-modal";

export default function DorsaisDoEventoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento, definirLogo } = useEventos();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { atletas } = useAtletas();
  const {
    obterCriterio,
    definirCriterio,
    obter: obterFaixa,
    salvar: salvarFaixa,
  } = useFaixasNumeracao();
  const { obterPorInscricao, atualizarControles } = useDorsais();
  const { listarPorEvento: listarImagensDoEvento } = useGaleria();

  const evento = obterEvento(eventoId);
  const criterio = obterCriterio(eventoId);

  const imagensDoEvento = listarImagensDoEvento(eventoId);

  const confirmadasDoEvento = useMemo(
    () => inscricoes.filter((i) => i.eventoId === eventoId && i.status === "confirmada"),
    [inscricoes, eventoId]
  );

  const categoriasDoEvento = useMemo(() => {
    const idsUsados = new Set(
      provas.filter((p) => p.eventoId === eventoId).map((p) => p.categoriaId)
    );
    return categorias.filter((c) => idsUsados.has(c.id));
  }, [provas, categorias, eventoId]);

  // Grupos de numeração (categorias ou faixas etárias) com a contagem de
  // inscritos confirmados em cada um, para o admin dimensionar as faixas.
  const grupos = useMemo(() => {
    if (criterio === "categoria") {
      return categoriasDoEvento.map((c) => ({
        grupoId: c.id,
        grupoNome: c.nome,
        inscritos: confirmadasDoEvento.filter((i) => {
          const prova = provas.find((p) => p.id === i.provaId);
          return prova?.categoriaId === c.id;
        }).length,
      }));
    }

    return FAIXAS_ETARIAS.map((faixa) => {
      const inscritos = confirmadasDoEvento.filter((i) => {
        const prova = provas.find((p) => p.id === i.provaId);
        const atleta = atletas.find((a) => a.nome === i.atletaNome);
        const grupo = resolverGrupoNumeracao(
          "idade",
          categorias.find((c) => c.id === prova?.categoriaId),
          atleta
        );
        return grupo.grupoId === faixa.id;
      }).length;
      return { grupoId: faixa.id, grupoNome: faixa.rotulo, inscritos };
    });
  }, [criterio, categoriasDoEvento, confirmadasDoEvento, provas, atletas, categorias]);

  const [editandoFaixa, setEditandoFaixa] = useState<FaixaEmEdicao | null>(null);

  function abrirEdicaoFaixa(grupoId: string, grupoNome: string) {
    const atual = obterFaixa(eventoId, grupoId);
    setEditandoFaixa({
      grupoId,
      grupoNome,
      numeroInicial: atual?.numeroInicial ?? 1,
      numeroFinal: atual?.numeroFinal ?? 20,
      cor: atual?.cor ?? "azul",
    });
  }

  function trocarCriterio(novo: CriterioNumeracao) {
    if (novo === criterio) return;
    definirCriterio(eventoId, novo);
    setEditandoFaixa(null);
  }

  const dorsaisAtribuidos = useMemo(() => {
    return confirmadasDoEvento
      .map((inscricao) => {
        const prova = provas.find((p) => p.id === inscricao.provaId);
        const categoria = categorias.find((c) => c.id === prova?.categoriaId);
        const atleta = atletas.find((a) => a.nome === inscricao.atletaNome);
        const grupo = resolverGrupoNumeracao(criterio, categoria, atleta);
        const dorsal = obterPorInscricao(inscricao.id);
        return { inscricao, grupoNome: grupo.grupoNome, dorsal };
      })
      .sort((a, b) => (a.dorsal?.numero ?? 9999) - (b.dorsal?.numero ?? 9999));
  }, [confirmadasDoEvento, provas, categorias, atletas, criterio, obterPorInscricao]);

  if (!evento) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Evento não encontrado.</p>
        <Link href="/admin/eventos" className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline">
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href={`/admin/eventos/${eventoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o evento
      </Link>

      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dorsais</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
        </div>
        <Link href={`/admin/eventos/${eventoId}/dorsais/imprimir`}>
          <Button>
            <Printer className="h-4 w-4" />
            Imprimir dorsais (A4)
          </Button>
        </Link>
      </header>

      {/* Configuração das faixas de numeração */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Settings2 className="h-4 w-4 text-brand-blue" />
          Faixas de numeração
        </h2>

        {/* Escolha do critério de separação */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">Separar por:</span>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => trocarCriterio("categoria")}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                criterio === "categoria"
                  ? "bg-brand-blue text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Categoria
            </button>
            <button
              type="button"
              onClick={() => trocarCriterio("idade")}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                criterio === "idade"
                  ? "bg-brand-blue text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Idade (faixa etária)
            </button>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {criterio === "categoria"
              ? "A faixa colorida do peito segue a categoria da prova."
              : "A faixa colorida do peito segue a idade do atleta."}
          </span>
        </div>

        {grupos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {criterio === "categoria"
                ? "Cadastre provas para este evento antes de configurar as faixas de numeração."
                : "Cadastre atletas com data de nascimento para a separação por idade."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {grupos.map((grupo) => {
              const faixa = obterFaixa(eventoId, grupo.grupoId);
              return (
                <div
                  key={grupo.grupoId}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-8 w-1.5 rounded-full"
                      style={{ backgroundColor: COR_FAIXA_HEX[faixa?.cor ?? "azul"] }}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {grupo.grupoNome}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {grupo.inscritos} inscrito{grupo.inscritos === 1 ? "" : "s"} ·{" "}
                        {faixa
                          ? `${String(faixa.numeroInicial).padStart(3, "0")} a ${String(faixa.numeroFinal).padStart(3, "0")} · ${COR_FAIXA_LABEL[faixa.cor]}`
                          : "Faixa não configurada"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => abrirEdicaoFaixa(grupo.grupoId, grupo.grupoNome)}
                  >
                    {faixa ? "Editar faixa" : "Configurar"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Logo do evento no dorsal */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <ImageIcon className="h-4 w-4 text-brand-blue" />
          Logo do evento no dorsal
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Escolha a imagem que aparece no canto superior do peito impresso. Envie imagens na{" "}
          <Link
            href={`/admin/eventos/${eventoId}/galeria`}
            className="font-medium text-brand-blue hover:underline"
          >
            Galeria do evento
          </Link>{" "}
          e selecione uma abaixo.
        </p>

        {imagensDoEvento.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhuma imagem na galeria deste evento ainda. Envie um logo na galeria para usá-lo no
              dorsal (categoria Logo).
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => definirLogo(evento.id, "")}
              className={`flex h-14 items-center justify-center rounded-xl border bg-white px-4 text-sm font-medium text-slate-600 transition-colors dark:bg-slate-950 dark:text-slate-300 ${
                !evento.logoUrl
                  ? "border-brand-blue ring-2 ring-brand-blue/40"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
              }`}
            >
              Sem logo
            </button>

            {imagensDoEvento.map((img) => {
              const selecionada = evento.logoUrl === img.url;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => definirLogo(evento.id, img.url)}
                  title={img.nome}
                  className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border bg-white transition-colors dark:bg-slate-950 ${
                    selecionada
                      ? "border-brand-blue ring-2 ring-brand-blue/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.nome} className="h-full w-full object-cover" />
                  {selecionada && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-blue text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Dorsais já atribuídos */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Hash className="h-4 w-4 text-brand-blue" />
          Dorsais atribuídos
        </h2>

        {dorsaisAtribuidos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhuma inscrição confirmada com dorsal atribuído ainda. O número é gerado
              automaticamente assim que a inscrição é confirmada e a faixa do grupo está
              configurada.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Nº</th>
                  <th className="px-4 py-3 font-medium">Atleta</th>
                  <th className="px-4 py-3 font-medium">
                    {criterio === "categoria" ? "Categoria" : "Faixa etária"}
                  </th>
                  <th className="px-4 py-3 font-medium">Check-in</th>
                  <th className="px-4 py-3 font-medium">Kit</th>
                  <th className="px-4 py-3 font-medium">Medalha</th>
                  <th className="px-4 py-3 font-medium">Alimentação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dorsaisAtribuidos.map(({ inscricao, grupoNome, dorsal }) => (
                  <tr key={inscricao.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {dorsal ? String(dorsal.numero).padStart(3, "0") : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {inscricao.atletaNome}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {grupoNome}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={!dorsal}
                        checked={dorsal?.checkInFeito ?? false}
                        onChange={(e) =>
                          atualizarControles(inscricao.id, { checkInFeito: e.target.checked }, "Admin")
                        }
                        className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={!dorsal}
                        checked={dorsal?.kitEntregue ?? false}
                        onChange={(e) =>
                          atualizarControles(inscricao.id, { kitEntregue: e.target.checked }, "Admin")
                        }
                        className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={!dorsal}
                        checked={dorsal?.medalhaEntregue ?? false}
                        onChange={(e) =>
                          atualizarControles(inscricao.id, { medalhaEntregue: e.target.checked }, "Admin")
                        }
                        className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={!dorsal}
                        checked={dorsal?.alimentacaoEntregue ?? false}
                        onChange={(e) =>
                          atualizarControles(inscricao.id, {
                            alimentacaoEntregue: e.target.checked,
                          }, "Admin")
                        }
                        className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <EditarFaixaModal
        faixa={editandoFaixa}
        onClose={() => setEditandoFaixa(null)}
        onSalvar={(dados) => {
          if (editandoFaixa) salvarFaixa(eventoId, editandoFaixa.grupoId, editandoFaixa.grupoNome, dados);
          setEditandoFaixa(null);
        }}
      />
    </div>
  );
}
