"use client";

import { useMemo, useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, Check, X, ClipboardList } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useProvas } from "@/lib/mock/provas-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useInscricoes, Inscricao, InscricaoStatus } from "@/lib/mock/inscricoes-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type FormState = {
  atletaId: string; // "" ou "manual" quando não vinculado a um cadastro
  atletaNomeManual: string;
  eventoId: string;
  provaId: string;
  status: InscricaoStatus;
};

const OPCAO_MANUAL = "manual";

const STATUS_LABEL: Record<InscricaoStatus, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const STATUS_STYLE: Record<InscricaoStatus, string> = {
  pendente: "bg-amber-100 text-amber-600",
  confirmada: "bg-brand-green/10 text-brand-green",
  cancelada: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export default function InscricoesPage() {
  const { eventos } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { provas } = useProvas();
  const { atletas } = useAtletas();
  const { inscricoes, criar, atualizar, alterarStatus, excluir } = useInscricoes();

  const [filtroEvento, setFiltroEvento] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    eventoId: eventos[0]?.id ?? "",
    provaId: "",
    atletaId: atletas[0]?.id ?? OPCAO_MANUAL,
    atletaNomeManual: "",
    status: "pendente",
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  function nomeEvento(id: string) {
    return eventos.find((e) => e.id === id)?.nome ?? "—";
  }

  function descricaoProva(provaId: string) {
    const prova = provas.find((p) => p.id === provaId);
    if (!prova) return "—";
    const modalidade = modalidades.find((m) => m.id === prova.modalidadeId)?.nome ?? "—";
    const categoria = categorias.find((c) => c.id === prova.categoriaId)?.nome ?? "—";
    return `${modalidade} · ${categoria}`;
  }

  const inscricoesFiltradas = useMemo(() => {
    return inscricoes.filter((i) => {
      if (filtroEvento !== "todos" && i.eventoId !== filtroEvento) return false;
      if (filtroStatus !== "todos" && i.status !== filtroStatus) return false;
      return true;
    });
  }, [inscricoes, filtroEvento, filtroStatus]);

  const provasDoEventoSelecionado = provas.filter((p) => p.eventoId === form.eventoId);

  function abrirCriacao() {
    setEditandoId(null);
    const eventoId = eventos[0]?.id ?? "";
    setForm({
      eventoId,
      provaId: provas.find((p) => p.eventoId === eventoId)?.id ?? "",
      atletaId: atletas[0]?.id ?? OPCAO_MANUAL,
      atletaNomeManual: "",
      status: "pendente",
    });
    setErros({});
    setModalAberto(true);
  }

  function abrirEdicao(inscricao: Inscricao) {
    setEditandoId(inscricao.id);
    const atletaCorrespondente = atletas.find((a) => a.nome === inscricao.atletaNome);
    setForm({
      eventoId: inscricao.eventoId,
      provaId: inscricao.provaId,
      atletaId: atletaCorrespondente?.id ?? OPCAO_MANUAL,
      atletaNomeManual: atletaCorrespondente ? "" : inscricao.atletaNome,
      status: inscricao.status,
    });
    setErros({});
    setModalAberto(true);
  }

  function validar() {
    const novosErros: Record<string, string> = {};
    if (form.atletaId === OPCAO_MANUAL && !form.atletaNomeManual.trim()) {
      novosErros.atletaNomeManual = "Informe o nome do atleta.";
    }
    if (!form.eventoId) novosErros.eventoId = "Selecione o evento.";
    if (!form.provaId) novosErros.provaId = "Selecione a prova.";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validar()) return;

    const atletaNome =
      form.atletaId === OPCAO_MANUAL
        ? form.atletaNomeManual.trim()
        : atletas.find((a) => a.id === form.atletaId)?.nome ?? "";

    const dados = {
      eventoId: form.eventoId,
      provaId: form.provaId,
      atletaNome,
      status: form.status,
    };

    if (editandoId) {
      atualizar(editandoId, dados);
    } else {
      criar(dados);
    }
    setModalAberto(false);
  }

  const inscricaoParaExcluir = inscricoes.find((i) => i.id === excluindoId);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Inscrições</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Todas as inscrições de todos os eventos.
          </p>
        </div>
        <Button onClick={abrirCriacao} disabled={eventos.length === 0 || provas.length === 0}>
          <Plus className="h-4 w-4" />
          Nova inscrição
        </Button>
      </header>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Select
          value={filtroEvento}
          onChange={(e) => setFiltroEvento(e.target.value)}
          className="w-auto"
        >
          <option value="todos">Todos os eventos</option>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Select>

        <Select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="w-auto"
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="confirmada">Confirmada</option>
          <option value="cancelada">Cancelada</option>
        </Select>
      </div>

      {inscricoesFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma inscrição encontrada com esses filtros.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {inscricoesFiltradas.map((inscricao) => (
            <div
              key={inscricao.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-blue/10 p-2">
                  <ClipboardList className="h-4 w-4 text-brand-blue" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {inscricao.atletaNome}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[inscricao.status]}`}
                    >
                      {STATUS_LABEL[inscricao.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {nomeEvento(inscricao.eventoId)} · {descricaoProva(inscricao.provaId)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {inscricao.status === "pendente" && (
                  <>
                    <Button
                      variant="ghost"
                      aria-label="Confirmar inscrição"
                      className="text-brand-green hover:bg-brand-green/10"
                      onClick={() => alterarStatus(inscricao.id, "confirmada")}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Cancelar inscrição"
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={() => alterarStatus(inscricao.id, "cancelada")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" aria-label="Editar inscrição" onClick={() => abrirEdicao(inscricao)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Excluir inscrição"
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => setExcluindoId(inscricao.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalAberto}
        title={editandoId ? "Editar inscrição" : "Nova inscrição"}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Select
            id="atletaId"
            label="Atleta"
            value={form.atletaId}
            onChange={(e) => setForm({ ...form, atletaId: e.target.value })}
          >
            {atletas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
            <option value={OPCAO_MANUAL}>Atleta não cadastrado (digitar nome)</option>
          </Select>

          {form.atletaId === OPCAO_MANUAL && (
            <Input
              id="atletaNomeManual"
              label="Nome do atleta"
              placeholder="Ex: Marina Costa"
              value={form.atletaNomeManual}
              onChange={(e) => setForm({ ...form, atletaNomeManual: e.target.value })}
              error={erros.atletaNomeManual}
            />
          )}

          <Select
            id="eventoId"
            label="Evento"
            value={form.eventoId}
            onChange={(e) => {
              const eventoId = e.target.value;
              const primeiraProva = provas.find((p) => p.eventoId === eventoId)?.id ?? "";
              setForm({ ...form, eventoId, provaId: primeiraProva });
            }}
            error={erros.eventoId}
          >
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nome}
              </option>
            ))}
          </Select>

          <Select
            id="provaId"
            label="Prova"
            value={form.provaId}
            onChange={(e) => setForm({ ...form, provaId: e.target.value })}
            error={erros.provaId}
            disabled={provasDoEventoSelecionado.length === 0}
          >
            {provasDoEventoSelecionado.length === 0 && <option value="">Nenhuma prova neste evento</option>}
            {provasDoEventoSelecionado.map((p) => (
              <option key={p.id} value={p.id}>
                {descricaoProva(p.id)}
              </option>
            ))}
          </Select>

          <Select
            id="status"
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as InscricaoStatus })}
          >
            <option value="pendente">Pendente</option>
            <option value="confirmada">Confirmada</option>
            <option value="cancelada">Cancelada</option>
          </Select>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editandoId ? "Salvar alterações" : "Criar inscrição"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!inscricaoParaExcluir}
        title="Excluir inscrição"
        description={
          inscricaoParaExcluir
            ? `Tem certeza que deseja excluir a inscrição de "${inscricaoParaExcluir.atletaNome}"? Essa ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Excluir"
        onCancel={() => setExcluindoId(null)}
        onConfirm={() => {
          if (excluindoId) excluir(excluindoId);
          setExcluindoId(null);
        }}
      />
    </div>
  );
}
