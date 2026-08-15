"use client";

// Tela: Resultados — Revisão e aprovação (regra central 10).
//
// Todo tempo lançado pela Organização/Cronometragem entra como
// "aguardando" revisão. Aqui o Administrador aprova ou rejeita cada
// resultado (com motivo, quando rejeitado). Somente quando todos os
// tempos de uma prova estiverem aprovados a publicação fica disponível
// (a tela Publicação de Resultados bloqueia caso contrário).

import { useMemo, useState } from "react";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock3,
  ClipboardCheck,
  Undo2,
} from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useInscricoes, nomeDaInscricao } from "@/lib/mock/inscricoes-store";
import { useResultados } from "@/lib/mock/resultados-store";
import { useUsuarioOrganizacao } from "@/lib/supabase/usuario-organizacao";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

const REVISAO_STYLE: Record<string, string> = {
  aguardando: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  aprovado: "bg-brand-green/10 text-brand-green",
  rejeitado: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const REVISAO_LABEL: Record<string, string> = {
  aguardando: "Aguardando",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

function formatarDataHora(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResultadosPage() {
  const { eventos } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { inscricoes, erro: erroInscricoes } = useInscricoes();
  const { resultados, obterPorInscricao, aprovar, rejeitar, voltarParaRevisao, erro: erroResultados } =
    useResultados();
  const { nome } = useUsuarioOrganizacao();

  const [eventoId, setEventoId] = useState("");
  const [provaId, setProvaId] = useState("");

  const [rejeitandoId, setRejeitandoId] = useState<string | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [erroMotivo, setErroMotivo] = useState(false);

  function nomeEvento(id: string) {
    return eventos.find((e) => e.id === id)?.nome ?? "—";
  }
  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  const provasDoEvento = useMemo(
    () => provas.filter((p) => p.eventoId === eventoId),
    [provas, eventoId]
  );

  const linhas = useMemo(() => {
    if (!provaId) return [];
    return inscricoes
      .filter((i) => i.provaId === provaId && i.status === "confirmada")
      .map((inscricao) => ({
        inscricao,
        resultado: obterPorInscricao(inscricao.id),
      }))
      .sort((a, b) => {
        const ta = a.resultado?.tempo ?? "";
        const tb = b.resultado?.tempo ?? "";
        return ta.localeCompare(tb);
      });
  }, [inscricoes, provaId, obterPorInscricao]);

  const comTempo = linhas.filter((l) => l.resultado?.tempo);
  const aguardando = comTempo.filter((l) => l.resultado?.revisao === "aguardando");
  const aprovados = comTempo.filter((l) => l.resultado?.revisao === "aprovado");
  const rejeitados = comTempo.filter((l) => l.resultado?.revisao === "rejeitado");
  const semTempo = linhas.filter((l) => !l.resultado?.tempo);

  const prova = provas.find((p) => p.id === provaId);

  function handleAprovar(inscricaoId: string) {
    aprovar(inscricaoId, nome || "Admin");
  }

  function abrirRejeicao(inscricaoId: string) {
    setRejeitandoId(inscricaoId);
    setMotivoRejeicao("");
    setErroMotivo(false);
  }

  function confirmarRejeicao() {
    if (!rejeitandoId) return;
    if (!motivoRejeicao.trim()) {
      setErroMotivo(true);
      return;
    }
    rejeitar(rejeitandoId, motivoRejeicao.trim(), nome || "Admin");
    setRejeitandoId(null);
    setMotivoRejeicao("");
    setErroMotivo(false);
  }

  const todosAprovados =
    comTempo.length > 0 && aguardando.length === 0 && rejeitados.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Revisão de Resultados
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Aprove ou rejeite os tempos lançados antes de publicar a classificação de cada prova.
        </p>
      </header>

      <AlertaPersistencia erro={erroInscricoes ?? erroResultados} />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="max-w-xs flex-1">
          <Select
            id="evento"
            label="Evento"
            value={eventoId}
            onChange={(e) => {
              setEventoId(e.target.value);
              setProvaId("");
            }}
          >
            <option value="">Selecionar evento</option>
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </Select>
        </div>
        <div className="max-w-xs flex-1">
          <Select
            id="prova"
            label="Prova"
            value={provaId}
            onChange={(e) => setProvaId(e.target.value)}
            disabled={!eventoId}
          >
            <option value="">Selecionar prova</option>
            {provasDoEvento.map((p) => (
              <option key={p.id} value={p.id}>
                {nomeModalidade(p.modalidadeId)} · {nomeCategoria(p.categoriaId)}
                {p.horario ? ` · ${p.horario}` : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {!provaId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <Trophy className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Selecione um evento e uma prova para revisar os resultados.
          </p>
        </div>
      ) : (
        <>
          {comTempo.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <ResumoRevisao
                icone={<Clock3 className="h-4 w-4" />}
                cor="bg-amber-100 text-amber-600"
                label="Aguardando"
                valor={aguardando.length}
              />
              <ResumoRevisao
                icone={<CheckCircle2 className="h-4 w-4" />}
                cor="bg-brand-green/10 text-brand-green"
                label="Aprovados"
                valor={aprovados.length}
              />
              <ResumoRevisao
                icone={<XCircle className="h-4 w-4" />}
                cor="bg-red-100 text-red-600"
                label="Rejeitados"
                valor={rejeitados.length}
              />
              <ResumoRevisao
                icone={<ClipboardCheck className="h-4 w-4" />}
                cor="bg-sky-100 text-sky-600"
                label="Pronto p/ publicar"
                valor={todosAprovados ? 1 : 0}
              />
            </div>
          )}

          {prova && (
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {nomeModalidade(prova.modalidadeId)} · {nomeCategoria(prova.categoriaId)}
              {prova.horario ? ` · ${prova.horario}` : ""} — {nomeEvento(prova.eventoId)}
            </div>
          )}

          {comTempo.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum tempo lançado para esta prova ainda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-4 py-3 font-medium">Atleta</th>
                    <th className="px-4 py-3 font-medium">Tempo</th>
                    <th className="px-4 py-3 font-medium">Revisão</th>
                    <th className="px-4 py-3 font-medium">Revisor</th>
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {comTempo.map(({ inscricao, resultado }) => (
                    <tr key={inscricao.id}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {nomeDaInscricao(inscricao)}
                        {inscricao.numeroPeito ? (
                          <span className="ml-2 text-xs text-slate-400">
                            peito {inscricao.numeroPeito}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                        {resultado?.tempo}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            REVISAO_STYLE[resultado?.revisao ?? "aguardando"]
                          }`}
                        >
                          {REVISAO_LABEL[resultado?.revisao ?? "aguardando"]}
                        </span>
                        {resultado?.revisao === "rejeitado" &&
                          resultado.revisaoObservacao && (
                            <p className="mt-1 max-w-[220px] text-xs text-red-600 dark:text-red-400">
                              {resultado.revisaoObservacao}
                            </p>
                          )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {resultado?.revisadoEm
                          ? `${resultado.revisadoPor ?? "—"} · ${formatarDataHora(resultado.revisadoEm)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {resultado?.revisao === "aprovado" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              onClick={() => voltarParaRevisao(inscricao.id)}
                              title="Voltar para revisão"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : resultado?.revisao === "rejeitado" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              onClick={() => voltarParaRevisao(inscricao.id)}
                              title="Voltar para revisão"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleAprovar(inscricao.id)}
                              className="bg-brand-green hover:bg-brand-green/90"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Aprovar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                              onClick={() => abrirRejeicao(inscricao.id)}
                            >
                              <XCircle className="h-4 w-4" />
                              Rejeitar
                            </Button>
                            <Button
                              onClick={() => handleAprovar(inscricao.id)}
                              className="bg-brand-green hover:bg-brand-green/90"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Aprovar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {semTempo.length > 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Clock3 className="h-3.5 w-3.5" />
                Aguardando tempo ({semTempo.length})
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                {semTempo.map(({ inscricao }) => (
                  <span key={inscricao.id}>{nomeDaInscricao(inscricao)}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <ClipboardCheck className="h-3.5 w-3.5" />
            A publicação de resultados fica disponível quando todos os tempos da prova estiverem
            aprovados.
          </div>
        </>
      )}

      <Modal
        open={!!rejeitandoId}
        title="Rejeitar resultado"
        onClose={() => setRejeitandoId(null)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Informe o motivo da rejeição. O tempo voltará para a Organização/Cronometragem
            para correção.
          </p>
          <Input
            id="motivoRejeicao"
            label="Motivo"
            placeholder="Ex.: tempo inválido, atleta ausente..."
            value={motivoRejeicao}
            onChange={(e) => {
              setMotivoRejeicao(e.target.value);
              if (e.target.value.trim()) setErroMotivo(false);
            }}
            error={erroMotivo ? "Informe o motivo da rejeição." : undefined}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejeitandoId(null)}>
              Cancelar
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmarRejeicao}>
              Rejeitar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ResumoRevisao({
  icone,
  cor,
  label,
  valor,
}: {
  icone: React.ReactNode;
  cor: string;
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`rounded-xl p-2 ${cor}`}>{icone}</div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{valor}</p>
    </div>
  );
}
