"use client";

// Gestão da equipe REAL de funcionários (contas autenticadas vinculadas
// à organização via organizacao_usuarios). Fonte única: API
// /api/admin/funcionarios — nada de catálogo mock aqui. Editar troca o
// papel (autorização); excluir revoga o vínculo (perde o acesso à área
// de organização).
import { useState, FormEvent, useEffect, useCallback } from "react";
import { UserPlus, Pencil, Trash2, Copy, Check, Wand2, ShieldCheck } from "lucide-react";
import { PAPEL_ORGANIZACAO_LABEL } from "@/lib/mock/funcionarios-store";
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

type RealFuncionario = {
  authUserId: string;
  nome: string;
  email: string;
  telefone: string;
  papel: PapelOrganizacao;
  ativo: boolean;
  vinculadoEm: string | null;
};

type FormDados = {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  papel: PapelOrganizacao;
};

const FORM_VAZIO: FormDados = {
  nome: "",
  email: "",
  telefone: "",
  senha: "",
  papel: "organizador",
};

function gerarSenha() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const rnd = new Uint8Array(12);
  crypto.getRandomValues(rnd);
  return Array.from(rnd, (b) => charset[b % charset.length]).join("");
}

// Aviso quando a equipe não pôde ser carregada da API (nunca esconder
// falha de leitura).
function AlertaFuncionarios({ erro }: { erro: string | null }) {
  if (!erro) return null;
  return (
    <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Não foi possível carregar a equipe</p>
        <p className="mt-0.5">{erro}</p>
      </div>
    </div>
  );
}

function BotaoCopiar({ texto, label }: { texto: string; label: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard indisponível — ignora.
    }
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={copiar}
      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
    >
      {copiado ? <Check className="h-4 w-4 text-brand-green" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export default function UsuariosPage() {
  const [funcionarios, setFuncionarios] = useState<RealFuncionario[]>([]);
  const [erroFuncionarios, setErroFuncionarios] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormDados>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<RealFuncionario | null>(null);
  const [submetendo, setSubmetendo] = useState(false);
  const [credenciais, setCredenciais] = useState<{
    nome: string;
    email: string;
    senha: string;
  } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch("/api/admin/funcionarios");
      const dados = await resposta.json();
      if (!resposta.ok) {
        throw new Error(dados.erro ?? "Não foi possível carregar a equipe.");
      }
      setFuncionarios(dados.funcionarios ?? []);
      setErroFuncionarios(null);
    } catch (e) {
      setErroFuncionarios(
        e instanceof Error ? e.message : "Falha ao carregar a equipe."
      );
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(f: RealFuncionario) {
    setEditandoId(f.authUserId);
    setForm({
      nome: f.nome,
      email: f.email,
      telefone: f.telefone,
      senha: "",
      papel: f.papel,
    });
    setErro(null);
    setModalAberto(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) {
      setErro("Informe pelo menos nome e e-mail do funcionário.");
      return;
    }
    setSubmetendo(true);
    setErro(null);
    try {
      if (editandoId) {
        const resposta = await fetch("/api/admin/funcionarios", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuarioId: editandoId,
            nome: form.nome.trim(),
            telefone: form.telefone.trim(),
            papel: form.papel,
          }),
        });
        const dados = await resposta.json();
        if (!resposta.ok) {
          throw new Error(dados.erro ?? "Não foi possível atualizar o funcionário.");
        }
        await carregar();
        setModalAberto(false);
        return;
      }

      const resposta = await fetch("/api/admin/funcionarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim(),
          papel: form.papel,
          ativo: true,
          senha: form.senha,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        throw new Error(dados.erro ?? "Não foi possível criar a conta do funcionário.");
      }
      await carregar();
      setModalAberto(false);
      setCredenciais({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: dados.senhaTemporaria,
      });
    } catch (erroCatch) {
      setErro(
        erroCatch instanceof Error ? erroCatch.message : "Não foi possível salvar."
      );
    } finally {
      setSubmetendo(false);
    }
  }

  async function excluir() {
    if (!excluindo) return;
    setSubmetendo(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/admin/funcionarios", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: excluindo.authUserId }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        throw new Error(dados.erro ?? "Não foi possível remover o funcionário.");
      }
      await carregar();
      setExcluindo(null);
    } catch (erroCatch) {
      setExcluindo(null);
      setErroFuncionarios(
        erroCatch instanceof Error ? erroCatch.message : "Falha ao remover o funcionário."
      );
    } finally {
      setSubmetendo(false);
    }
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
            (organizadores, cronometragem, financeiro). Excluir revoga o acesso imediatamente.
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <UserPlus className="h-4 w-4" />
          Novo funcionário
        </Button>
      </header>

      <AlertaFuncionarios erro={erroFuncionarios} />

      {funcionarios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum funcionário vinculado à organização ainda.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Funcionário</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {funcionarios.map((f) => (
                <tr key={f.authUserId}>
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
              disabled={!!editandoId}
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
          {!editandoId && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="senhaTemporaria"
                  className="text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Senha temporária de acesso
                </label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, senha: gerarSenha() })}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Gerar senha
                </button>
              </div>
              <Input
                id="senhaTemporaria"
                type="text"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                placeholder="Deixe em branco para gerar automaticamente"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                O funcionário entrará no site com este e-mail e esta senha. A senha será mostrada
                apenas uma vez, logo após o cadastro.
              </p>
            </div>
          )}
          <Select
            id="papel"
            label="Papel"
            value={form.papel}
            onChange={(e) => setForm({ ...form, papel: e.target.value as PapelOrganizacao })}
          >
            {(Object.keys(PAPEL_ORGANIZACAO_LABEL) as PapelOrganizacao[]).map((p) => (
              <option key={p} value={p}>
                {PAPEL_ORGANIZACAO_LABEL[p]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            O papel define as funções liberadas na área de Organização (ex.: organizador acessa
            eventos, provas e inscritos; cronometragem acessa a cronometragem e resultados).
          </p>

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={submetendo}>
              {editandoId ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!credenciais}
        title="Funcionário criado — credenciais de acesso"
        onClose={() => setCredenciais(null)}
      >
        {credenciais && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              O funcionário entrará no site pelo botão "Entrar" com o e-mail e a senha abaixo:
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    Nome
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-900 dark:text-white">
                    {credenciais.nome}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    E-mail
                  </dt>
                  <dd className="mt-0.5 flex items-center justify-between gap-2 font-medium text-slate-900 dark:text-white">
                    {credenciais.email}
                    <BotaoCopiar texto={credenciais.email} label="Copiar e-mail" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    Senha temporária
                  </dt>
                  <dd className="mt-0.5 flex items-center justify-between gap-2 font-medium text-slate-900 dark:text-white">
                    <span className="font-mono">{credenciais.senha}</span>
                    <BotaoCopiar texto={credenciais.senha} label="Copiar senha" />
                  </dd>
                </div>
              </dl>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Por segurança, a senha não será exibida novamente.
            </p>
            <Button type="button" className="w-full" onClick={() => setCredenciais(null)}>
              Entendi
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!excluindo}
        title="Excluir funcionário"
        description={
          excluindo
            ? `Tem certeza que deseja remover ${excluindo.nome}? Ele perderá o acesso à área de organização imediatamente.`
            : ""
        }
        confirmLabel="Excluir"
        onCancel={() => setExcluindo(null)}
        onConfirm={excluir}
      />
    </div>
  );
}
