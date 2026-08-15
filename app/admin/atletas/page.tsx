"use client";

import { useMemo, useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, Search, User } from "lucide-react";
import { useAtletas, Atleta } from "@/lib/mock/atletas-store";
import { useCategorias } from "@/lib/mock/categorias-store";
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
  responsavelNome: string;
  email: string;
  telefone: string;
};

const FORM_VAZIO: FormState = {
  nome: "",
  dataNascimento: "",
  categoriaId: "",
  responsavelNome: "",
  email: "",
  telefone: "",
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

export default function AtletasPage() {
  const { atletas, criar, atualizar, excluir, erro: erroAtletas } = useAtletas();
  const { categorias } = useCategorias();

  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  function nomeCategoria(id: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "—";
  }

  const atletasFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return atletas;
    return atletas.filter((a) => a.nome.toLowerCase().includes(termo));
  }, [atletas, busca]);

  const atletaParaExcluir = atletas.find((a) => a.id === excluindoId);

  function abrirCriacao() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErros({});
    setModalAberto(true);
  }

  function abrirEdicao(atleta: Atleta) {
    setEditandoId(atleta.id);
    setForm({
      nome: atleta.nome,
      dataNascimento: atleta.dataNascimento,
      categoriaId: atleta.categoriaId,
      responsavelNome: atleta.responsavelNome,
      email: atleta.email,
      telefone: atleta.telefone,
    });
    setErros({});
    setModalAberto(true);
  }

  function validar() {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome do atleta.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      novosErros.email = "Informe um e-mail válido.";
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validar()) return;

    const dados = {
      nome: form.nome.trim(),
      dataNascimento: form.dataNascimento,
      categoriaId: form.categoriaId,
      responsavelNome: form.responsavelNome.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
    };

    if (editandoId) {
      atualizar(editandoId, dados);
    } else {
      criar(dados);
    }
    setModalAberto(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Atletas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Base completa de atletas cadastrados no sistema.
          </p>
        </div>
        <Button onClick={abrirCriacao}>
          <Plus className="h-4 w-4" />
          Novo atleta
        </Button>
      </header>

      <AlertaPersistencia erro={erroAtletas} />

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {atletasFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {atletas.length === 0
              ? "Nenhum atleta cadastrado ainda."
              : "Nenhum atleta encontrado para essa busca."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {atletasFiltrados.map((atleta) => {
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
                      {atleta.responsavelNome ? ` · Responsável: ${atleta.responsavelNome}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" aria-label={`Editar ${atleta.nome}`} onClick={() => abrirEdicao(atleta)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Excluir ${atleta.nome}`}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => setExcluindoId(atleta.id)}
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
        title={editandoId ? "Editar atleta" : "Novo atleta"}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            id="nome"
            label="Nome completo"
            placeholder="Ex: Marina Costa"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            error={erros.nome}
          />

          <div className="grid grid-cols-2 gap-4">
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
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>

          <Input
            id="responsavelNome"
            label="Nome do responsável (se menor de idade)"
            placeholder="Opcional"
            value={form.responsavelNome}
            onChange={(e) => setForm({ ...form, responsavelNome: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="email"
              type="email"
              label="E-mail"
              placeholder="Opcional"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={erros.email}
            />
            <Input
              id="telefone"
              label="Telefone"
              placeholder="Opcional"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editandoId ? "Salvar alterações" : "Criar atleta"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!atletaParaExcluir}
        title="Excluir atleta"
        description={
          atletaParaExcluir
            ? `Tem certeza que deseja excluir "${atletaParaExcluir.nome}"? Essa ação não pode ser desfeita.`
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
