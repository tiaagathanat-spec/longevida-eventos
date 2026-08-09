"use client";

import { useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, ListChecks, Users2 } from "lucide-react";
import { useTiposProva, TipoProva } from "@/lib/mock/tipos-prova-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type FormState = {
  nome: string;
  permiteEquipe: boolean;
  descricao: string;
};

const FORM_VAZIO: FormState = { nome: "", permiteEquipe: false, descricao: "" };

export default function TiposProvaPage() {
  const { tiposProva, criar, atualizar, excluir } = useTiposProva();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const tipoParaExcluir = tiposProva.find((t) => t.id === excluindoId);

  function abrirCriacao() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErros({});
    setErroEnvio(null);
    setModalAberto(true);
  }

  function abrirEdicao(tipo: TipoProva) {
    setEditandoId(tipo.id);
    setForm({
      nome: tipo.nome,
      permiteEquipe: tipo.permiteEquipe,
      descricao: tipo.descricao,
    });
    setErros({});
    setErroEnvio(null);
    setModalAberto(true);
  }

  function validar() {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome do tipo de prova.";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validar()) return;

    const dados = {
      nome: form.nome.trim(),
      permiteEquipe: form.permiteEquipe,
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
      setErroEnvio(err instanceof Error ? err.message : "Não foi possível salvar o tipo de prova.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Tipos de Prova
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Formato de disputa (individual, revezamento, eliminatória etc.), reutilizável entre eventos.
          </p>
        </div>
        <Button onClick={abrirCriacao}>
          <Plus className="h-4 w-4" />
          Novo tipo de prova
        </Button>
      </header>

      {tiposProva.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum tipo de prova cadastrado ainda.
          </p>
          <Button onClick={abrirCriacao} className="mt-4">
            <Plus className="h-4 w-4" />
            Criar primeiro tipo de prova
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tiposProva.map((tipo) => (
            <div
              key={tipo.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-blue/10 p-2">
                  <ListChecks className="h-4 w-4 text-brand-blue" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {tipo.nome}
                    </p>
                    {tipo.permiteEquipe && (
                      <span className="flex items-center gap-1 rounded-full bg-brand-green/10 px-2 py-0.5 text-[11px] font-medium text-brand-green">
                        <Users2 className="h-3 w-3" />
                        Por equipe
                      </span>
                    )}
                  </div>
                  {tipo.descricao && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{tipo.descricao}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  aria-label={`Editar ${tipo.nome}`}
                  onClick={() => abrirEdicao(tipo)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Excluir ${tipo.nome}`}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => setExcluindoId(tipo.id)}
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
        title={editandoId ? "Editar tipo de prova" : "Novo tipo de prova"}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            id="nome"
            label="Nome"
            placeholder="Ex: Individual, Revezamento, Eliminatória"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            error={erros.nome}
          />

          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.permiteEquipe}
              onChange={(e) => setForm({ ...form, permiteEquipe: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
            />
            Disputada por equipe (ex: revezamento)
          </label>

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
              {editandoId ? "Salvar alterações" : "Criar tipo de prova"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!tipoParaExcluir}
        title="Excluir tipo de prova"
        description={
          tipoParaExcluir
            ? `Tem certeza que deseja excluir "${tipoParaExcluir.nome}"? Eventos que já usam esse tipo não serão afetados retroativamente.`
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
