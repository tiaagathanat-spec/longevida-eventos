"use client";

import { useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useCategorias, Categoria } from "@/lib/mock/categorias-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

type FormState = {
  nome: string;
  idadeMinima: string;
  idadeMaxima: string;
  descricao: string;
};

const FORM_VAZIO: FormState = { nome: "", idadeMinima: "", idadeMaxima: "", descricao: "" };

function faixaEtaria(categoria: Categoria) {
  const { idadeMinima, idadeMaxima } = categoria;
  if (idadeMinima == null && idadeMaxima == null) return "Livre";
  if (idadeMaxima == null) return `${idadeMinima}+ anos`;
  if (idadeMinima == null) return `até ${idadeMaxima} anos`;
  return `${idadeMinima} a ${idadeMaxima} anos`;
}

export default function CategoriasPage() {
  const { categorias, criar, atualizar, excluir, erro: erroCategorias } = useCategorias();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const categoriaParaExcluir = categorias.find((c) => c.id === excluindoId);

  function abrirCriacao() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErros({});
    setErroEnvio(null);
    setModalAberto(true);
  }

  function abrirEdicao(categoria: Categoria) {
    setEditandoId(categoria.id);
    setForm({
      nome: categoria.nome,
      idadeMinima: categoria.idadeMinima?.toString() ?? "",
      idadeMaxima: categoria.idadeMaxima?.toString() ?? "",
      descricao: categoria.descricao,
    });
    setErros({});
    setErroEnvio(null);
    setModalAberto(true);
  }

  function validar() {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome da categoria.";
    if (
      form.idadeMinima &&
      form.idadeMaxima &&
      Number(form.idadeMinima) > Number(form.idadeMaxima)
    ) {
      novosErros.idadeMaxima = "A idade máxima deve ser maior que a mínima.";
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validar()) return;

    const dados = {
      nome: form.nome.trim(),
      idadeMinima: form.idadeMinima ? Number(form.idadeMinima) : null,
      idadeMaxima: form.idadeMaxima ? Number(form.idadeMaxima) : null,
      descricao: form.descricao.trim(),
    };

    setEnviando(true);
    setErroEnvio(null);
    try {
      if (editandoId) {
        await atualizar(editandoId, dados);
      } else {
        await criar(dados);
      }
      setModalAberto(false);
    } catch (err) {
      setErroEnvio(err instanceof Error ? err.message : "Não foi possível salvar a categoria.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Categorias</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Faixas etárias e níveis reutilizáveis entre eventos.
          </p>
        </div>
        <Button onClick={abrirCriacao}>
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </header>

      <AlertaPersistencia erro={erroCategorias} />

      {categorias.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma categoria cadastrada ainda.
          </p>
          <Button onClick={abrirCriacao} className="mt-4">
            <Plus className="h-4 w-4" />
            Criar primeira categoria
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categorias.map((categoria) => (
            <div
              key={categoria.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-blue/10 p-2">
                  <Tag className="h-4 w-4 text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {categoria.nome}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {faixaEtaria(categoria)}
                    {categoria.descricao ? ` · ${categoria.descricao}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  aria-label={`Editar ${categoria.nome}`}
                  onClick={() => abrirEdicao(categoria)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Excluir ${categoria.nome}`}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => setExcluindoId(categoria.id)}
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
        title={editandoId ? "Editar categoria" : "Nova categoria"}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            id="nome"
            label="Nome da categoria"
            placeholder="Ex: Infantil A"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            error={erros.nome}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="idadeMinima"
              type="number"
              min={0}
              label="Idade mínima"
              placeholder="Opcional"
              value={form.idadeMinima}
              onChange={(e) => setForm({ ...form, idadeMinima: e.target.value })}
            />
            <Input
              id="idadeMaxima"
              type="number"
              min={0}
              label="Idade máxima"
              placeholder="Opcional"
              value={form.idadeMaxima}
              onChange={(e) => setForm({ ...form, idadeMaxima: e.target.value })}
              error={erros.idadeMaxima}
            />
          </div>

          <Textarea
            id="descricao"
            label="Descrição (opcional)"
            rows={3}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />

          {erroEnvio && <p className="text-sm text-red-500">{erroEnvio}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={enviando}>
              {editandoId ? "Salvar alterações" : "Criar categoria"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!categoriaParaExcluir}
        title="Excluir categoria"
        description={
          categoriaParaExcluir
            ? `Tem certeza que deseja excluir "${categoriaParaExcluir.nome}"? Eventos que já usam essa categoria não serão afetados retroativamente.`
            : undefined
        }
        confirmLabel="Excluir"
        onCancel={() => setExcluindoId(null)}
        onConfirm={() => {
          if (excluindoId) excluir(excluindoId).catch(() => {});
          setExcluindoId(null);
        }}
      />
    </div>
  );
}
