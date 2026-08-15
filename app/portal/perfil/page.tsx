"use client";

// Tela: Meu Perfil (regra central 11).
//
// Permite ao usuário logado editar os dados do próprio perfil e trocar
// a foto. Em modo demonstração, os dados ficam na store mock
// (lib/mock/perfis-store.tsx) e a foto vira uma data URL — como no
// cadastro. Quando o backend real entrar, tudo passa a vir de
// `usuarios`/auth (Supabase).
//
// Sincronização best-effort com o Supabase: nome e telefone também são
// gravados na tabela `usuarios` quando há usuário autenticado. A foto
// fica apenas na store mock (a tabela `usuarios` não tem coluna de
// foto) — no backend real ela iria para o Storage.

import { useState, FormEvent } from "react";
import { Camera, User, Trash2, Check, ShieldCheck } from "lucide-react";
import { usePerfis } from "@/lib/mock/perfis-store";
import { useSessao } from "@/lib/mock/sessao";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AlertaPersistencia } from "@/components/ui/alerta-persistencia";

export default function MeuPerfilPage() {
  const { sessao, definirSessao } = useSessao();
  const { obterPorEmail, atualizar, criar, erro: erroPerfis } = usePerfis();

  const perfilExistente = obterPorEmail(sessao.email);

  const [form, setForm] = useState({
    nome: perfilExistente?.nome ?? sessao.nome,
    telefone: perfilExistente?.telefone ?? "",
    dataNascimento: perfilExistente?.dataNascimento ?? "",
    genero: perfilExistente?.genero ?? "",
    endereco: perfilExistente?.endereco ?? "",
    contatoEmergenciaNome: perfilExistente?.contatoEmergenciaNome ?? "",
    contatoEmergenciaTelefone: perfilExistente?.contatoEmergenciaTelefone ?? "",
    observacoesSaude: perfilExistente?.observacoesSaude ?? "",
    foto: perfilExistente?.foto ?? "",
  });

  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function atualizarCampo(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function selecionarFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem (JPG, PNG...).");
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      atualizarCampo("foto", String(leitor.result ?? ""));
      setErro(null);
    };
    leitor.readAsDataURL(arquivo);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!form.nome.trim()) {
      setErro("Informe seu nome completo.");
      return;
    }

    setIsLoading(true);
    try {
      const dados = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        dataNascimento: form.dataNascimento,
        genero: form.genero,
        endereco: form.endereco.trim(),
        contatoEmergenciaNome: form.contatoEmergenciaNome.trim(),
        contatoEmergenciaTelefone: form.contatoEmergenciaTelefone.trim(),
        observacoesSaude: form.observacoesSaude.trim(),
        foto: form.foto,
      };

      if (perfilExistente) {
        atualizar(sessao.email, dados);
      } else {
        criar({
          tipoConta: "atleta",
          email: sessao.email,
          cpf: "",
          ...dados,
        });
      }

      // Mantém a sessão mock consistente se o nome mudou (os filtros de
      // Meus Atletas / Inscrições usam sessao.nome).
      if (form.nome.trim() !== sessao.nome) {
        definirSessao({ nome: form.nome.trim(), email: sessao.email });
      }

      // Sincronização best-effort com o Supabase (tabela `usuarios`).
      const supabase = createClient();
      const { data: usuario } = await supabase.auth.getUser();
      if (usuario.user) {
        await supabase
          .from("usuarios")
          .update({ nome: form.nome.trim(), telefone: form.telefone.trim() })
          .eq("id", usuario.user.id);
      }

      setSucesso("Perfil atualizado com sucesso.");
    } catch {
      setErro("Não foi possível salvar agora. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Meu perfil</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Seus dados pessoais e foto de perfil usados no Portal do Atleta.
        </p>
      </header>

      <AlertaPersistencia erro={erroPerfis} />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* Foto de perfil */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              {form.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.foto}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-9 w-9" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="foto"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Camera className="h-4 w-4" />
                {form.foto ? "Trocar foto" : "Adicionar foto"}
              </label>
              <input
                id="foto"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => selecionarFoto(e.target.files?.[0])}
              />
              {form.foto && (
                <button
                  type="button"
                  onClick={() => atualizarCampo("foto", "")}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover foto
                </button>
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500">
                JPG ou PNG. A foto aparece ao lado do seu nome na barra de navegação.
              </p>
            </div>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Dados pessoais
          </h2>

          <div className="flex flex-col gap-4">
            <Input
              id="nome"
              label="Nome completo"
              placeholder="Seu nome"
              autoComplete="name"
              value={form.nome}
              onChange={(e) => atualizarCampo("nome", e.target.value)}
            />

            <Input
              id="email"
              type="email"
              label="E-mail"
              value={sessao.email}
              disabled
              helper="O e-mail é o seu identificador de acesso e não pode ser alterado aqui."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="telefone"
                label="Telefone"
                placeholder="(11) 90000-0000"
                autoComplete="tel"
                value={form.telefone}
                onChange={(e) => atualizarCampo("telefone", e.target.value)}
              />
              <Input
                id="dataNascimento"
                type="date"
                label="Data de nascimento"
                value={form.dataNascimento}
                onChange={(e) => atualizarCampo("dataNascimento", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="genero"
                label="Gênero"
                value={form.genero}
                onChange={(e) => atualizarCampo("genero", e.target.value)}
              >
                <option value="">Selecionar</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </Select>
              <Input
                id="endereco"
                label="Endereço"
                placeholder="Rua, número — cidade/UF"
                autoComplete="street-address"
                value={form.endereco}
                onChange={(e) => atualizarCampo("endereco", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="contatoEmergenciaNome"
                label="Contato de emergência"
                placeholder="Nome"
                value={form.contatoEmergenciaNome}
                onChange={(e) => atualizarCampo("contatoEmergenciaNome", e.target.value)}
              />
              <Input
                id="contatoEmergenciaTelefone"
                label="Telefone do contato"
                placeholder="(11) 90000-0000"
                value={form.contatoEmergenciaTelefone}
                onChange={(e) => atualizarCampo("contatoEmergenciaTelefone", e.target.value)}
              />
            </div>

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
                onChange={(e) => atualizarCampo("observacoesSaude", e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {erro && (
          <p role="alert" className="text-sm text-red-500">
            {erro}
          </p>
        )}
        {sucesso && (
          <p className="flex items-center gap-1.5 text-sm text-brand-green">
            <Check className="h-4 w-4" />
            {sucesso}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" isLoading={isLoading}>
            Salvar alterações
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Seus dados ficam visíveis apenas para você e a organização dos eventos.
          </p>
        </div>
      </form>
    </div>
  );
}
