"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Pencil, LogIn, Trash2, ShieldCheck, ExternalLink, KeyRound } from "lucide-react";
import {
  useFuncionarios,
  Funcionario,
  PAPEL_ORGANIZACAO_LABEL,
  ORGANIZACOES_DEMO,
  ModuloOrganizacao,
  MODULOS_ORGANIZACAO,
  PERMISSOES_POR_PAPEL,
} from "@/lib/mock/funcionarios-store";
import type { PapelOrganizacao } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const PAPEL_STYLE: Record<PapelOrganizacao, string> = {
  administrador: "bg-brand-blue/10 text-brand-blue",
  organizador: "bg-brand-green/10 text-brand-green",
  cronometragem: "bg-violet-100 text-violet-600",
  financeiro: "bg-amber-100 text-amber-600",
  leitura: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

type FormDados = {
  nome: string;
  email: string;
  telefone: string;
  papel: PapelOrganizacao;
  organizacaoId: string;
  ativo: boolean;
  permissoes: ModuloOrganizacao[];
};

const FORM_VAZIO: FormDados = {
  nome: "",
  email: "",
  telefone: "",
  papel: "organizador",
  organizacaoId: "1",
  ativo: true,
  permissoes: PERMISSOES_POR_PAPEL.organizador,
};

export default function UsuariosPage() {
  const router = useRouter();
  const { funcionarios, criar, atualizar, excluir, funcionarioAtivo, entrarComo, sairComo } =
    useFuncionarios();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormDados>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Funcionario | null>(null);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(f: Funcionario) {
    setEditandoId(f.id);
    setForm({
      nome: f.nome,
      email: f.email,
      telefone: f.telefone,
      papel: f.papel,
      organizacaoId: f.organizacaoId,
      ativo: f.ativo,
      permissoes: f.permissoes ?? PERMISSOES_POR_PAPEL[f.papel],
    });
    setErro(null);
    setModalAberto(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) {
      setErro("Informe pelo menos nome e e-mail do funcionário.");
      return;
    }
    if (editandoId) {
      atualizar(editandoId, form);
    } else {
      criar(form);
    }
    setModalAberto(false);
  }

  function nomeOrganizacao(id: string) {
    return ORGANIZACOES_DEMO.find((o) => o.id === id)?.nome ?? "—";
  }

  function togglePermissao(modulo: ModuloOrganizacao) {
    setForm((atual) => ({
      ...atual,
      permissoes: atual.permissoes.includes(modulo)
        ? atual.permissoes.filter((m) => m !== modulo)
        : [...atual.permissoes, modulo],
    }));
  }

  function handleEntrarComo(f: Funcionario) {
    entrarComo(f.id);
    router.push("/organizacao/dashboard");
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Funcionários
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cadastre a equipe de organização e escolha quem pode acessar a área de trabalho
            (organizadores, cronometragem, financeiro).
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <UserPlus className="h-4 w-4" />
          Novo funcionário
        </Button>
      </header>

      {funcionarioAtivo && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-green/30 bg-brand-green/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-brand-green" />
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Você está operando como{" "}
              <span className="font-semibold">{funcionarioAtivo.nome}</span>{" "}
              ({PAPEL_ORGANIZACAO_LABEL[funcionarioAtivo.papel]})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => router.push("/organizacao/dashboard")}>
              <ExternalLink className="h-4 w-4" />
              Ir para a área de Organização
            </Button>
            <Button variant="ghost" onClick={sairComo}>
              Voltar ao modo administrador
            </Button>
          </div>
        </div>
      )}

      {funcionarios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum funcionário cadastrado ainda.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Funcionário</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Permissões</th>
                <th className="px-4 py-3 font-medium">Organização</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {funcionarios.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{f.nome}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {f.email} · {f.telefone || "sem telefone"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PAPEL_STYLE[f.papel]}`}
                    >
                      {PAPEL_ORGANIZACAO_LABEL[f.papel]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(f)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <KeyRound className="h-3 w-3" />
                      {(f.permissoes ?? []).length} funções
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {nomeOrganizacao(f.organizacaoId)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        f.ativo
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {f.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        aria-label={`Editar ${f.nome}`}
                        onClick={() => abrirEdicao(f)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Entrar como ${f.nome}`}
                        disabled={!f.ativo}
                        onClick={() => handleEntrarComo(f)}
                      >
                        <LogIn className="h-4 w-4" />
                        Entrar como
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Excluir ${f.nome}`}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        onClick={() => setExcluindo(f)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalAberto}
        title={editandoId ? "Editar funcionário" : "Novo funcionário"}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            id="nome"
            label="Nome completo"
            placeholder="Ex: Ricardo Almeida"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="email"
              type="email"
              label="E-mail"
              placeholder="funcionario@exemplo.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              id="telefone"
              label="Telefone"
              placeholder="(11) 90000-0000"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              id="papel"
              label="Papel"
              value={form.papel}
              onChange={(e) => {
                const papel = e.target.value as PapelOrganizacao;
                setForm({
                  ...form,
                  papel,
                  permissoes: PERMISSOES_POR_PAPEL[papel],
                });
              }}
            >
              {(Object.keys(PAPEL_ORGANIZACAO_LABEL) as PapelOrganizacao[]).map((p) => (
                <option key={p} value={p}>
                  {PAPEL_ORGANIZACAO_LABEL[p]}
                </option>
              ))}
            </Select>
            <Select
              id="organizacao"
              label="Organização"
              value={form.organizacaoId}
              onChange={(e) => setForm({ ...form, organizacaoId: e.target.value })}
            >
              {ORGANIZACOES_DEMO.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Funções liberadas na área de Organização
            </p>
            <div className="grid grid-cols-1 gap-1.5 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              {MODULOS_ORGANIZACAO.map(({ chave, label }) => {
                const marcada = form.permissoes.includes(chave);
                return (
                  <label
                    key={chave}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      marcada
                        ? "bg-brand-green/10 font-medium text-slate-900 dark:text-white"
                        : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() => togglePermissao(chave)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green/30"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              Ajuste caso a caso para liberar ou bloquear cada função para este funcionário.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
            />
            Funcionário ativo (pode entrar como organizador)
          </label>

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editandoId ? "Salvar" : "Cadastrar"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!excluindo}
        title="Excluir funcionário"
        description={
          excluindo
            ? `Tem certeza que deseja excluir ${excluindo.nome}? Ele não conseguirá mais acessar a área de organização.`
            : ""
        }
        confirmLabel="Excluir"
        onCancel={() => setExcluindo(null)}
        onConfirm={() => {
          if (excluindo) excluir(excluindo.id);
          setExcluindo(null);
        }}
      />
    </div>
  );
}
