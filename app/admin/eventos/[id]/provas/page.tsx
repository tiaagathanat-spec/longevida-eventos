"use client";

import { useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Copy, Clock } from "lucide-react";
import { useEventos } from "@/lib/mock/eventos-store";
import { useModalidades } from "@/lib/mock/modalidades-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useTiposProva } from "@/lib/mock/tipos-prova-store";
import { useProvas, Prova, TipoIdentificacaoProva, identificacaoDaProva } from "@/lib/mock/provas-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type FormState = {
  modalidadeId: string;
  categoriaId: string;
  tipoProvaId: string;
  horario: string;
  observacoes: string;
  valor: string;
  tipoIdentificacao: TipoIdentificacaoProva;
};

export default function ProvasDoEventoPage() {
  const params = useParams<{ id: string }>();
  const eventoId = params.id;

  const { obterPorId: obterEvento } = useEventos();
  const { modalidades } = useModalidades();
  const { categorias } = useCategorias();
  const { tiposProva } = useTiposProva();
  const { listarPorEvento, criar, atualizar, excluir, duplicar } = useProvas();

  const evento = obterEvento(eventoId);
  const provas = listarPorEvento(eventoId);

  const formVazio: FormState = {
    modalidadeId: modalidades[0]?.id ?? "",
    categoriaId: categorias[0]?.id ?? "",
    tipoProvaId: tiposProva[0]?.id ?? "",
    horario: "",
    observacoes: "",
    valor: "",
    tipoIdentificacao: "dorsal",
  };

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(formVazio);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const provaParaExcluir = provas.find((p) => p.id === excluindoId);

  function nomeModalidade(id: string) {
    return modalidades.find((m) => m.id === id)?.nome ?? "—";
  }
  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }
  function nomeTipoProva(id: string) {
    return tiposProva.find((t) => t.id === id)?.nome ?? "—";
  }

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function abrirCriacao() {
    setEditandoId(null);
    setForm(formVazio);
    setErros({});
    setModalAberto(true);
  }

  function abrirEdicao(prova: Prova) {
    setEditandoId(prova.id);
    setForm({
      modalidadeId: prova.modalidadeId,
      categoriaId: prova.categoriaId,
      tipoProvaId: prova.tipoProvaId,
      horario: prova.horario,
      observacoes: prova.observacoes,
      valor: String(prova.valor),
      tipoIdentificacao: identificacaoDaProva(prova),
    });
    setErros({});
    setModalAberto(true);
  }

  function validar() {
    const novosErros: Record<string, string> = {};
    if (!form.modalidadeId) novosErros.modalidadeId = "Selecione a modalidade.";
    if (!form.categoriaId) novosErros.categoriaId = "Selecione a categoria.";
    if (!form.tipoProvaId) novosErros.tipoProvaId = "Selecione o tipo de prova.";
    const valorNumerico = Number(form.valor.replace(",", "."));
    if (!form.valor || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      novosErros.valor = "Informe o valor da inscrição.";
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validar()) return;

    const dados = {
      eventoId,
      modalidadeId: form.modalidadeId,
      categoriaId: form.categoriaId,
      tipoProvaId: form.tipoProvaId,
      horario: form.horario,
      observacoes: form.observacoes.trim(),
      valor: Number(form.valor.replace(",", ".")),
      tipoIdentificacao: form.tipoIdentificacao,
    };

    if (editandoId) {
      atualizar(editandoId, dados);
    } else {
      criar(dados);
    }
    setModalAberto(false);
  }

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

  const semCadastrosBase = modalidades.length === 0 || categorias.length === 0 || tiposProva.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href={`/admin/eventos/${eventoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o evento
      </Link>

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Provas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evento.nome}</p>
        </div>
        <Button onClick={abrirCriacao} disabled={semCadastrosBase}>
          <Plus className="h-4 w-4" />
          Nova prova
        </Button>
      </header>

      {semCadastrosBase && (
        <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Cadastre pelo menos uma Modalidade, Categoria e Tipo de Prova antes de criar provas.
        </div>
      )}

      {provas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma prova cadastrada para este evento ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {provas.map((prova) => (
            <div
              key={prova.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {nomeModalidade(prova.modalidadeId)} · {nomeCategoria(prova.categoriaId)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{nomeTipoProva(prova.tipoProvaId)}</span>
                  {prova.horario && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {prova.horario}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      identificacaoDaProva(prova) === "card"
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                    }`}
                  >
                    {identificacaoDaProva(prova) === "card"
                      ? "Card 8,5×5,5 cm"
                      : "Dorsal (número de peito)"}
                  </span>
                  {prova.observacoes && <span>{prova.observacoes}</span>}
                </div>
                <p className="mt-1.5 text-sm font-semibold text-brand-green">
                  {formatarMoeda(prova.valor)}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  aria-label="Duplicar prova"
                  onClick={() => duplicar(prova.id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" aria-label="Editar prova" onClick={() => abrirEdicao(prova)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Excluir prova"
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => setExcluindoId(prova.id)}
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
        title={editandoId ? "Editar prova" : "Nova prova"}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Select
            id="modalidadeId"
            label="Modalidade"
            value={form.modalidadeId}
            onChange={(e) => setForm({ ...form, modalidadeId: e.target.value })}
            error={erros.modalidadeId}
          >
            {modalidades.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="categoriaId"
              label="Categoria"
              value={form.categoriaId}
              onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
              error={erros.categoriaId}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>

            <Select
              id="tipoProvaId"
              label="Tipo de prova"
              value={form.tipoProvaId}
              onChange={(e) => setForm({ ...form, tipoProvaId: e.target.value })}
              error={erros.tipoProvaId}
            >
              {tiposProva.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </div>

          <Input
            id="horario"
            type="time"
            label="Horário (opcional)"
            value={form.horario}
            onChange={(e) => setForm({ ...form, horario: e.target.value })}
          />

          <Input
            id="valor"
            label="Valor da inscrição (R$)"
            placeholder="Ex.: 150,00"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            error={erros.valor}
          />

          <Select
            id="tipoIdentificacao"
            label="Identificação do atleta"
            value={form.tipoIdentificacao}
            onChange={(e) =>
              setForm({
                ...form,
                tipoIdentificacao: e.target.value as TipoIdentificacaoProva,
              })
            }
          >
            <option value="dorsal">Dorsal (número de peito)</option>
            <option value="card">Card (credencial 8,5×5,5 cm)</option>
          </Select>
          <p className="mt-0 text-xs text-slate-400 dark:text-slate-500">
            Dorsal gera número de peito e impressão 19×14,5 cm. Card usa a credencial oficial
            8,5×5,5 cm com QR, sem número de peito.
          </p>

          <Textarea
            id="observacoes"
            label="Observações (opcional)"
            rows={3}
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editandoId ? "Salvar alterações" : "Criar prova"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!provaParaExcluir}
        title="Excluir prova"
        description="Tem certeza que deseja excluir esta prova? Essa ação não pode ser desfeita."
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
