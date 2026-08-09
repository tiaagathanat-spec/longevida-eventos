"use client";

import { useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, Waves } from "lucide-react";
import { useModalidades, Modalidade, Estilo } from "@/lib/mock/modalidades-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type FormState = {
  nome: string;
  estilo: Estilo;
  distanciaMetros: string;
  descricao: string;
};

const FORM_VAZIO: FormState = { nome: "", estilo: "livre", distanciaMetros: "", descricao: "" };

const ESTILO_LABEL: Record<Estilo, string> = {
  livre: "Livre",
  costas: "Costas",
  peito: "Peito",
  borboleta: "Borboleta",
  medley: "Medley",
};

function resumo(modalidade: Modalidade) {
  const partes = [ESTILO_LABEL[modalidade.estilo]];
  if (modalidade.distanciaMetros) partes.push(`${modalidade.distanciaMetros}m`);
  return partes.join(" · ");
}

export default function ModalidadesPage() {
  const { modalidades, criar, atualizar, excluir } = useModalidades();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const modalidadeParaExcluir = modalidades.find((m) => m.id === excluindoId);

  function abrirCriacao() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErros({});
    setErroEnvio(null);
    setModalAberto(true);
  }

  function abrirEdicao(modalidade: Modalidade) {
    setEditandoId(modalidade.id);
    setForm({
      nome: modalidade.nome,
      estilo: modalidade.estilo,
      distanciaMetros: modalidade.distanciaMetros?.toString() ?? "",
      descricao: modalidade.descricao,
    });
    setErros({});
    setErroEnvio(null);
    setModalAberto(true);
  }

  function validar() {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome da modalidade.";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validar()) return;

    const dados = {
      nome: form.nome.trim(),
      estilo: form.estilo,
      distanciaMetros: form.distanciaMetros ? Number(form.distanciaMetros) : null,
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
      setErroEnvio(err instanceof Error ? err.message : "Não foi possível salvar a modalidade.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Modalidades</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Provas reutilizáveis entre eventos (estilo e distância).
          </p>
        </div>
        <Button onClick={abrirCriacao}>
          <Plus className="h-4 w-4" />
          Nova modalidade
        </Button>
      </header>

      {modalidades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma modalidade cadastrada ainda.
          </p>
          <Button onClick={abrirCriacao} className="mt-4">
            <Plus className="h-4 w-4" />
            Criar primeira modalidade
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {modalidades.map((modalidade) => (
            <div
              key={modalidade.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-green/10 p-2">
                  <Waves className="h-4 w-4 text-brand-green" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {modalidade.nome}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {resumo(modalidade)}
                    {modalidade.descricao ? ` · ${modalidade.descricao}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  aria-label={`Editar ${modalidade.nome}`}
                  onClick={() => abrirEdicao(modalidade)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Excluir ${modalidade.nome}`}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => setExcluindoId(modalidade.id)}
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
        title={editandoId ? "Editar modalidade" : "Nova modalidade"}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            id="nome"
            label="Nome da modalidade"
            placeholder="Ex: 50m Livre"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            error={erros.nome}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="estilo"
              label="Estilo"
              value={form.estilo}
              onChange={(e) => setForm({ ...form, estilo: e.target.value as Estilo })}
            >
              <option value="livre">Livre</option>
              <option value="costas">Costas</option>
              <option value="peito">Peito</option>
              <option value="borboleta">Borboleta</option>
              <option value="medley">Medley</option>
            </Select>

            <Input
              id="distanciaMetros"
              type="number"
              min={0}
              label="Distância (m)"
              placeholder="Opcional"
              value={form.distanciaMetros}
              onChange={(e) => setForm({ ...form, distanciaMetros: e.target.value })}
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
              {editandoId ? "Salvar alterações" : "Criar modalidade"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!modalidadeParaExcluir}
        title="Excluir modalidade"
        description={
          modalidadeParaExcluir
            ? `Tem certeza que deseja excluir "${modalidadeParaExcluir.nome}"? Eventos que já usam essa modalidade não serão afetados retroativamente.`
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
