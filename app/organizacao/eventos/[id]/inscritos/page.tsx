"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Search } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { useDorsais } from "@/lib/mock/dorsais-store";
import {
  useFaixasNumeracao,
  COR_FAIXA_HEX,
  resolverGrupoNumeracao,
} from "@/lib/mock/faixas-numeracao-store";import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function OrganizacaoInscritosPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes } = useInscricoes();
  const { atletas } = useAtletas();
  const { obterPorInscricao: obterResultado } = useResultados();
  const { obterPorInscricao: obterDorsal, atualizarControles } = useDorsais();
  const { obterCriterio, obter: obterFaixa } = useFaixasNumeracao();

  const evento = obterEvento(eventoId);
  const provasDoEvento = useMemo(
    () => provas.filter((p) => p.eventoId === eventoId),
    [provas, eventoId]
  );

  const [provaId, setProvaId] = useState("todas");
  const [busca, setBusca] = useState("");

  const criterio = obterCriterio(eventoId);

  const linhas = useMemo(() => {
    return inscricoes
      .filter((i) => i.eventoId === eventoId && i.status === "confirmada")
      .map((inscricao) => {
        const prova = provas.find((p) => p.id === inscricao.provaId);
        const categoria = categorias.find((c) => c.id === prova?.categoriaId);
        const atleta = atletas.find((a) => a.nome === inscricao.atletaNome);
        const grupo = resolverGrupoNumeracao(criterio, categoria, atleta);
        const dorsal = obterDorsal(inscricao.id);
        const resultado = obterResultado(inscricao.id);
        return { inscricao, prova, grupo, dorsal, resultado };
      })
      .filter((l) => (provaId === "todas" ? true : l.inscricao.provaId === provaId))
      .filter((l) => l.inscricao.atletaNome.toLowerCase().includes(busca.trim().toLowerCase()))
      .sort((a, b) => (a.dorsal?.numero ?? 9999) - (b.dorsal?.numero ?? 9999));
  }, [
    inscricoes,
    provas,
    categorias,
    atletas,
    criterio,
    obterDorsal,
    obterResultado,
    eventoId,
    provaId,
    busca,
  ]);

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

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Atletas inscritos
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="max-w-xs flex-1">
          <Input
            id="busca"
            label="Buscar atleta"
            placeholder="Nome do atleta..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
          <Search className="-mt-7 ml-3 h-4 w-4 text-slate-400" />
        </div>
        <div className="max-w-xs flex-1">
          <Select
            id="prova"
            label="Prova"
            value={provaId}
            onChange={(e) => setProvaId(e.target.value)}
          >
            <option value="todas">Todas as provas</option>
            {provasDoEvento.map((p) => (
              <option key={p.id} value={p.id}>
                {nomeModalidade(p.modalidadeId)} · {nomeCategoria(p.categoriaId)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {linhas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Nenhum atleta confirmado encontrado com esses filtros.
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
                <th className="px-4 py-3 font-medium">
                  {criterio === "categoria" ? "Categoria" : "Faixa etária"}
                </th>
                <th className="px-4 py-3 font-medium">Check-in</th>
                <th className="px-4 py-3 font-medium">Kit</th>
                <th className="px-4 py-3 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {linhas.map(({ inscricao, prova, grupo, dorsal, resultado }) => (
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
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            COR_FAIXA_HEX[obterFaixa(eventoId, grupo.grupoId)?.cor ?? "azul"],
                        }}
                      />
                      {grupo.grupoNome}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={dorsal?.checkInFeito ?? false}
                        onChange={(e) =>
                          atualizarControles(inscricao.id, { checkInFeito: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green/30"
                      />
                      <span
                        className={`text-xs font-medium ${
                          dorsal?.checkInFeito
                            ? "text-brand-green"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {dorsal?.checkInFeito ? "Feito" : "Marcar"}
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        dorsal?.kitEntregue
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {dorsal?.kitEntregue ? "Entregue" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {resultado?.tempo || "—"}
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
