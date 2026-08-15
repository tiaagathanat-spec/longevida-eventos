"use client";

import { useMemo, useState, FormEvent } from "react";
import { Plus, User, Pencil, HeartPulse, Trash2 } from "lucide-react";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useInscricoes } from "@/lib/mock/inscricoes-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useSessao } from "@/lib/mock/sessao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

type FormState = {
  nome: string;
  dataNascimento: string;
  categoriaId: string;
  observacoesSaude: string;
};

const FORM_VAZIO: FormState = {
  nome: "",
  dataNascimento: "",
  categoriaId: "",
  observacoesSaude: "",
};

function calcularIdade(dataNascimento: string) {
  if (!dataNascimento) return null;
  const nascimento = new Date(dataNascimento + "T00:00:00");
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

export default function MeusAtletasPage() {
  const { atletas, criar, atualizar, excluir, erro: erroAtletas } = useAtletas();
  const { inscricoes } = useInscricoes();
  const { categorias } = useCategorias();
  const { sessao } = useSessao();

  const meusAtletas = useMemo(
    () => atletas.filter((a) => a.responsavelNome === sessao.nome),
    [atletas, sessao.nome]
  );

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});

  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "Sem categoria";
  }

  function abrirCriacao() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErros({});
    setModalAberto(true);
  }

  function abrirEdicao(id: string) {
    const atleta = meusAtletas.find((a) => a.id === id);
    if (!atleta) return;
    setEditandoId(id);
    setForm({
      nome: atleta.nome,
      dataNascimento: atleta.dataNascimento,
      categoriaId: atleta.categoriaId,
      observacoesSaude: atleta.observacoesSaude ?? "",
    });
    setErros({});
    setModalAberto(true);
  }

  function validar() {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome do atleta.";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validar()) return;

    if (editandoId) {
      const atual = atletas.find((a) => a.id === editandoId);
      atualizar(editandoId, {
        nome: form.nome.trim(),
        dataNascimento: form.dataNascimento,
        categoriaId: form.categoriaId,
        responsavelNome: sessao.nome,
        email: atual?.email ?? "",
        telefone: atual?.telefone ?? "",
        observacoesSaude: form.observacoesSaude.trim(),
      });
    } else {
      criar({
        nome: form.nome.trim(),
        dataNascimento: form.dataNascimento,
        categoriaId: form.categoriaId,
        responsavelNome: sessao.nome,
        email: "",
        telefone: "",
        observacoesSaude: form.observacoesSaude.trim(),
      });
    }
    setModalAberto(false);
  }

  const atletaParaExcluir = excluirId
    ? meusAtletas.find((a) => a.id === excluirId)
    : null;
  const inscricoesDoAtleta = atletaParaExcluir
    ? inscricoes.filter((i) => i.atletaNome === atletaParaExcluir.nome)
    : [];

  function handleExcluir() {
    if (!excluirId) return;
    excluir(excluirId);
    setExcluirId(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Meus atletas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Atletas vinculados à sua conta.
          </p>
        </div>
        <Button onClick={abrirCriacao}>
          <Plus className="h-4 w-4" />
          Adicionar atleta
        </Button>
      </header>

      <AlertaPersistencia erro={erroAtletas} />

      {meusAtletas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum atleta vinculado ainda.
          </p>
          <Button onClick={abrirCriacao} className="mt-4">
            <Plus className="h-4 w-4" />
            Adicionar primeiro atleta
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {meusAtletas.map((atleta) => {
            const idade = calcularIdade(atleta.dataNascimento);
            return (
              <div
                key={atleta.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                    <User className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {atleta.nome}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {idade !== null ? `${idade} anos` : "Idade não informada"} ·{" "}
                      {nomeCategoria(atleta.categoriaId)}
                    </p>
                    {atleta.observacoesSaude ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <HeartPulse className="h-3.5 w-3.5" />
                        {atleta.observacoesSaude}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" aria-label={`Editar ${atleta.nome}`} onClick={() => abrirEdicao(atleta.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Excluir ${atleta.nome}`}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    onClick={() => setExcluirId(atleta.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalAberto}
        title={editandoId ? "Editar atleta" : "Adicionar atleta"}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            id="nome"
            label="Nome completo"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            error={erros.nome}
          />
          <Input
            id="dataNascimento"
            type="date"
            label="Data de nascimento"
            value={form.dataNascimento}
            onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
          />
          <Select
            id="categoriaId"
            label="Categoria"
            value={form.categoriaId}
            onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
          >
            <option value="">Selecionar depois</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="observacoesSaude"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Observações de saúde e restrições
            </label>
            <textarea
              id="observacoesSaude"
              rows={3}
              placeholder="Ex.: alergia a látex, não pode nadar em água fria..."
              value={form.observacoesSaude}
              onChange={(e) => setForm({ ...form, observacoesSaude: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editandoId ? "Salvar alterações" : "Adicionar"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!atletaParaExcluir}
        title={`Excluir ${atletaParaExcluir?.nome ?? "atleta"}?`}
        description={
          inscricoesDoAtleta.length > 0
            ? `${atletaParaExcluir?.nome} tem ${inscricoesDoAtleta.length} inscrição(ões) em eventos. Excluir o atleta remove o vínculo com sua conta: você deixará de enxergar e gerenciar essas inscrições.`
            : "Esta ação não pode ser desfeita."
        }
        confirmLabel="Excluir"
        onConfirm={handleExcluir}
        onCancel={() => setExcluirId(null)}
      />
    </div>
  );
}
