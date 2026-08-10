"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Users,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Camera,
  MailCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePerfis, type TipoContaCadastro } from "@/lib/mock/perfis-store";
import { useAtletas } from "@/lib/mock/atletas-store";
import { useCategorias } from "@/lib/mock/categorias-store";
import { useSessao } from "@/lib/mock/sessao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LogoLongevida } from "@/components/brand/logo-longevida";

type Etapa = "perfil" | "atletas" | "acesso";

type Genero = "" | "masculino" | "feminino" | "outro";

type DadosPerfil = {
  tipoConta: TipoContaCadastro;
  nome: string;
  email: string;
  dataNascimento: string;
  genero: Genero;
  cpf: string;
  telefone: string;
  endereco: string;
  contatoEmergenciaNome: string;
  contatoEmergenciaTelefone: string;
  observacoesSaude: string;
  foto: string;
};

const PERFIL_VAZIO: DadosPerfil = {
  tipoConta: "atleta",
  nome: "",
  email: "",
  dataNascimento: "",
  genero: "",
  cpf: "",
  telefone: "",
  endereco: "",
  contatoEmergenciaNome: "",
  contatoEmergenciaTelefone: "",
  observacoesSaude: "",
  foto: "",
};

type AtletaRascunho = {
  id: string;
  nome: string;
  dataNascimento: string;
  categoriaId: string;
  email: string;
  telefone: string;
  observacoesSaude: string;
};

const ETAPAS: { id: Etapa; rotulo: string }[] = [
  { id: "perfil", rotulo: "Perfil" },
  { id: "atletas", rotulo: "Atletas" },
  { id: "acesso", rotulo: "Acesso" },
];

const TIPOS: {
  valor: TipoContaCadastro;
  titulo: string;
  descricao: string;
  explicacao: string;
  icon: typeof User;
}[] = [
  {
    valor: "atleta",
    titulo: "Atleta",
    descricao: "Competidor que se inscreve nas provas.",
    explicacao:
      "Conta individual para quem compete. Você se cadastra com os seus dados de competição (categoria, contato de emergência, observações de saúde) e faz as suas próprias inscrições, acompanhando resultados no seu painel.",
    icon: User,
  },
  {
    valor: "responsavel",
    titulo: "Responsável",
    descricao: "Cuida das inscrições de um ou mais atletas.",
    explicacao:
      "Conta para quem representa outros atletas, como filhos ou dependentes. Você cria um perfil e pode vincular quantos atletas quiser — cada um com os próprios dados, categoria e restrições de saúde. É você quem faz as inscrições por eles.",
    icon: Users,
  },
];

function novoAtletaRascunho(perfil: DadosPerfil, id: string, paraResponsavel: boolean): AtletaRascunho {
  if (paraResponsavel) {
    return {
      id,
      nome: "",
      dataNascimento: "",
      categoriaId: "1",
      email: "",
      telefone: "",
      observacoesSaude: "",
    };
  }
  return {
    id,
    nome: perfil.nome,
    dataNascimento: perfil.dataNascimento,
    categoriaId: "1",
    email: perfil.email,
    telefone: perfil.telefone,
    observacoesSaude: perfil.observacoesSaude,
  };
}

export default function CadastroPage() {
  const router = useRouter();
  const { categorias } = useCategorias();
  const { criar: criarPerfil } = usePerfis();
  const { criar: criarAtleta } = useAtletas();
  const { definirSessao } = useSessao();

  const [etapa, setEtapa] = useState<Etapa>("perfil");
  const [perfil, setPerfil] = useState<DadosPerfil>(PERFIL_VAZIO);
  const [atletas, setAtletas] = useState<AtletaRascunho[]>([]);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const indiceEtapa = ETAPAS.findIndex((e) => e.id === etapa);

  function atualizarPerfil(campo: keyof DadosPerfil, valor: string | TipoContaCadastro) {
    setPerfil((atual) => ({ ...atual, [campo]: valor }));
  }

  function selecionarFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem (JPG, PNG...).");
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => atualizarPerfil("foto", String(leitor.result ?? ""));
    leitor.readAsDataURL(arquivo);
  }

  function atualizarAtleta(id: string, campo: keyof AtletaRascunho, valor: string) {
    setAtletas((atual) => atual.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
  }

  function removerAtleta(id: string) {
    setAtletas((atual) => atual.filter((a) => a.id !== id));
  }

  function adicionarAtleta() {
    setErro(null);
    setAtletas((atual) => [
      ...atual,
      novoAtletaRascunho(perfil, `atleta-${Date.now()}`, true),
    ]);
  }

  function validarPerfil() {
    if (!perfil.nome.trim()) return "Informe seu nome completo.";
    if (!perfil.email.trim()) return "Informe seu e-mail.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(perfil.email.trim()))
      return "Informe um e-mail válido.";
    return null;
  }

  function continuarPerfil(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const erroPerfil = validarPerfil();
    if (erroPerfil) {
      setErro(erroPerfil);
      return;
    }
    setErro(null);
    if (perfil.tipoConta === "atleta") {
      setAtletas([novoAtletaRascunho(perfil, "self", false)]);
    }
    setEtapa("atletas");
  }

  function validarAtletas() {
    if (atletas.length === 0) return "Vincule ao menos um atleta para continuar.";
    if (atletas.some((a) => !a.nome.trim())) return "Informe o nome de todos os atletas.";
    return null;
  }

  function continuarAtletas(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const erroAtletas = validarAtletas();
    if (erroAtletas) {
      setErro(erroAtletas);
      return;
    }
    setErro(null);
    setEtapa("acesso");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas informadas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: perfil.email.trim(),
        password: senha,
        options: {
          data: {
            nome: perfil.nome.trim(),
            // Usado pelo trigger fn_criar_usuario_apos_signup para gravar
            // o perfil em `usuarios` com o tipo correto.
            tipo_conta: perfil.tipoConta,
            data_nascimento: perfil.dataNascimento || null,
            genero: perfil.genero || null,
            cpf: perfil.cpf.trim(),
            telefone: perfil.telefone.trim(),
          },
        },
      });

      if (error) {
        setErro(mensagemErro(error.message));
        return;
      }

      // Demo: grava o perfil e os atletas na memória e troca a sessão
      // para que Meus Atletas, Inscrições etc. filtrem pelos novos dados.
      criarPerfil({
        tipoConta: perfil.tipoConta,
        nome: perfil.nome.trim(),
        email: perfil.email.trim(),
        dataNascimento: perfil.dataNascimento,
        genero: perfil.genero,
        cpf: perfil.cpf.trim(),
        telefone: perfil.telefone.trim(),
        endereco: perfil.endereco.trim(),
        contatoEmergenciaNome: perfil.contatoEmergenciaNome.trim(),
        contatoEmergenciaTelefone: perfil.contatoEmergenciaTelefone.trim(),
        observacoesSaude: perfil.observacoesSaude.trim(),
        foto: perfil.foto,
      });

      atletas.forEach((a) =>
        criarAtleta({
          nome: a.nome.trim(),
          dataNascimento: a.dataNascimento,
          categoriaId: a.categoriaId,
          responsavelNome: perfil.nome.trim(),
          email: a.email.trim(),
          telefone: a.telefone.trim(),
          observacoesSaude: a.observacoesSaude.trim(),
        })
      );

      definirSessao({ nome: perfil.nome.trim(), email: perfil.email.trim() });

      if (data.session && data.user) {
        // Confirmação de e-mail desativada: a sessão já existe. Garante
        // que o perfil criado pelo trigger tenha o tipo escolhido.
        await supabase
          .from("usuarios")
          .update({ tipo_conta: perfil.tipoConta })
          .eq("id", data.user.id);

        router.push("/portal/dashboard");
        router.refresh();
        return;
      }

      setSucesso(
        "Conta criada! Enviamos um link de confirmação para o seu e-mail. Após confirmar, você poderá fazer login."
      );
    } catch {
      setErro("Não foi possível criar a conta agora. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  function mensagemErro(mensagem: string) {
    const m = mensagem.toLowerCase();
    if (m.includes("already registered")) return "Este e-mail já está cadastrado. Faça login.";
    if (m.includes("invalid format") || m.includes("invalid email")) return "Informe um e-mail válido.";
    if (m.includes("password")) return "A senha não atende aos requisitos.";
    return mensagem;
  }

  return (
    <main className="relative grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
      {/* Identificação — canto superior direito */}
      <div className="absolute right-5 top-5 z-20">
        <LogoLongevida className="h-14 w-auto" />
      </div>
      {/* Painel de identidade — visível a partir de telas grandes */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-green p-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-0 h-80 w-80 rounded-full bg-brand-green-light/20 blur-3xl"
        />

        <span className="relative text-lg font-semibold tracking-tight">Longevida Eventos</span>

        <div className="relative max-w-sm">
          <h1 className="text-3xl font-semibold leading-tight">
            Primeiro acesso? Crie sua conta em poucos passos.
          </h1>
          <p className="mt-4 text-sm text-white/80">
            Preencha seu perfil, vincule os atletas que você representa e defina sua senha.
          </p>
        </div>

        <span className="relative text-xs text-white/60">Espaço Longevida</span>
      </div>

      {/* Formulário */}
      <div className="relative flex items-center justify-center px-6 py-16">
        {/* Marca d'água */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <LogoLongevida watermark className="h-[420px] w-auto opacity-[0.05]" />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Longevida Eventos
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Criar conta</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {etapa === "perfil" && "Primeiro acesso de atleta ou responsável."}
            {etapa === "atletas" &&
              (perfil.tipoConta === "atleta"
                ? "Confira os dados que serão usados nas inscrições."
                : "Vincule os atletas que você representa.")}
            {etapa === "acesso" && "Último passo: defina sua senha."}
          </p>

          {/* Indicador de etapas */}
          <ol className="mt-6 flex items-start gap-3">
            {ETAPAS.map((e, i) => {
              const concluida = i < indiceEtapa;
              const atual = i === indiceEtapa;
              return (
                <li key={e.id} className="flex flex-1 flex-col gap-1.5">
                  <span
                    className={`h-1 rounded-full ${
                      concluida
                        ? "bg-brand-blue"
                        : atual
                          ? "bg-brand-blue/40"
                          : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      concluida || atual
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {e.rotulo}
                  </span>
                </li>
              );
            })}
          </ol>

          {sucesso ? (
            <div className="mt-8 flex flex-col gap-4">
              <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6 text-center">
                <p className="text-sm text-brand-green">{sucesso}</p>
                <Link href="/login" className="mt-4 inline-block">
                  <Button>Ir para o login</Button>
                </Link>
              </div>
              <div
                role="note"
                className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left text-sm leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-300"
              >
                <p className="flex items-start gap-2.5">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong className="font-bold">Primeiro acesso:</strong> o seu login só será
                    liberado depois que o e-mail de confirmação for aberto e confirmado. Abra a
                    mensagem que enviamos para{" "}
                    <span className="font-semibold">{perfil.email.trim()}</span> e clique no link
                    para confirmar. Se não encontrar, verifique a caixa de spam/lixo eletrônico.
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Etapa 1 — Perfil */}
              {etapa === "perfil" && (
                <form onSubmit={continuarPerfil} noValidate className="mt-8 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Você é
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {TIPOS.map(({ valor, titulo, descricao, icon: Icon }) => {
                        const ativo = perfil.tipoConta === valor;
                        return (
                          <label
                            key={valor}
                            className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-3.5 transition-colors ${
                              ativo
                                ? "border-brand-blue bg-brand-blue/5"
                                : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                            }`}
                          >
                            <input
                              type="radio"
                              name="tipoConta"
                              value={valor}
                              checked={ativo}
                              onChange={() => atualizarPerfil("tipoConta", valor)}
                              className="sr-only"
                            />
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                ativo
                                  ? "bg-brand-blue text-white"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {titulo}
                            </span>
                            <span className="text-xs leading-snug text-slate-500 dark:text-slate-400">
                              {descricao}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Mini explicação do tipo selecionado */}
                    {TIPOS.map(({ valor, titulo, explicacao }) =>
                      perfil.tipoConta === valor ? (
                        <div
                          key={valor}
                          className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-3.5 text-xs leading-relaxed text-slate-600 dark:border-brand-blue/40 dark:bg-brand-blue/10 dark:text-slate-300"
                        >
                          <p className="mb-1 text-xs font-semibold text-brand-blue">
                            O que é o cadastro de {titulo.toLowerCase()}?
                          </p>
                          {explicacao}
                        </div>
                      ) : null
                    )}
                  </div>

                  {/* Foto de perfil */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                      {perfil.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={perfil.foto}
                          alt="Foto de perfil"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-7 w-7" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="foto"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <Camera className="h-4 w-4" />
                        {perfil.foto ? "Trocar foto" : "Adicionar foto"}
                      </label>
                      <input
                        id="foto"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => selecionarFoto(e.target.files?.[0])}
                      />
                      {perfil.foto && (
                        <button
                          type="button"
                          onClick={() => atualizarPerfil("foto", "")}
                          className="text-left text-xs font-medium text-slate-500 hover:text-red-500"
                        >
                          Remover foto
                        </button>
                      )}
                    </div>
                  </div>

                  <Input
                    id="nome"
                    label="Nome completo"
                    placeholder="Seu nome"
                    autoComplete="name"
                    value={perfil.nome}
                    onChange={(e) => atualizarPerfil("nome", e.target.value)}
                  />

                  <Input
                    id="email"
                    type="email"
                    label="E-mail"
                    placeholder="voce@exemplo.com"
                    autoComplete="email"
                    value={perfil.email}
                    onChange={(e) => atualizarPerfil("email", e.target.value)}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      id="dataNascimento"
                      type="date"
                      label="Data de nascimento"
                      value={perfil.dataNascimento}
                      onChange={(e) => atualizarPerfil("dataNascimento", e.target.value)}
                    />
                    <Select
                      id="genero"
                      label="Gênero"
                      value={perfil.genero}
                      onChange={(e) => atualizarPerfil("genero", e.target.value)}
                    >
                      <option value="">Selecionar</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      id="cpf"
                      label="CPF"
                      placeholder="000.000.000-00"
                      autoComplete="off"
                      value={perfil.cpf}
                      onChange={(e) => atualizarPerfil("cpf", e.target.value)}
                    />
                    <Input
                      id="telefone"
                      label="Telefone"
                      placeholder="(11) 90000-0000"
                      autoComplete="tel"
                      value={perfil.telefone}
                      onChange={(e) => atualizarPerfil("telefone", e.target.value)}
                    />
                  </div>

                  <Input
                    id="endereco"
                    label="Endereço"
                    placeholder="Rua, número — cidade/UF"
                    autoComplete="street-address"
                    value={perfil.endereco}
                    onChange={(e) => atualizarPerfil("endereco", e.target.value)}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      id="contatoEmergenciaNome"
                      label="Contato de emergência"
                      placeholder="Nome"
                      value={perfil.contatoEmergenciaNome}
                      onChange={(e) => atualizarPerfil("contatoEmergenciaNome", e.target.value)}
                    />
                    <Input
                      id="contatoEmergenciaTelefone"
                      label="Telefone do contato"
                      placeholder="(11) 90000-0000"
                      value={perfil.contatoEmergenciaTelefone}
                      onChange={(e) => atualizarPerfil("contatoEmergenciaTelefone", e.target.value)}
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
                      value={perfil.observacoesSaude}
                      onChange={(e) => atualizarPerfil("observacoesSaude", e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {erro && (
                    <p role="alert" className="text-sm text-red-500">
                      {erro}
                    </p>
                  )}

                  <div className="mt-2 flex justify-end">
                    <Button type="submit">
                      Continuar
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* Etapa 2 — Atletas */}
              {etapa === "atletas" && (
                <form onSubmit={continuarAtletas} noValidate className="mt-8 flex flex-col gap-4">
                  <div className="flex flex-col gap-4">
                    {atletas.map((a, index) => {
                      const removivel = perfil.tipoConta !== "atleta";
                      return (
                        <div
                          key={a.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                                <User className="h-3.5 w-3.5" />
                              </span>
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {perfil.tipoConta === "atleta" ? "Você" : `Atleta ${index + 1}`}
                              </span>
                            </div>
                            {removivel && (
                              <button
                                type="button"
                                onClick={() => removerAtleta(a.id)}
                                aria-label={`Remover atleta ${index + 1}`}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col gap-3">
                            <Input
                              id={`atleta-nome-${a.id}`}
                              label="Nome completo"
                              value={a.nome}
                              onChange={(e) => atualizarAtleta(a.id, "nome", e.target.value)}
                            />
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <Input
                                id={`atleta-nascimento-${a.id}`}
                                type="date"
                                label="Data de nascimento"
                                value={a.dataNascimento}
                                onChange={(e) =>
                                  atualizarAtleta(a.id, "dataNascimento", e.target.value)
                                }
                              />
                              <Select
                                id={`atleta-categoria-${a.id}`}
                                label="Categoria"
                                value={a.categoriaId}
                                onChange={(e) =>
                                  atualizarAtleta(a.id, "categoriaId", e.target.value)
                                }
                              >
                                <option value="">Selecionar depois</option>
                                {categorias.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <Input
                                id={`atleta-email-${a.id}`}
                                type="email"
                                label="E-mail"
                                value={a.email}
                                onChange={(e) => atualizarAtleta(a.id, "email", e.target.value)}
                              />
                              <Input
                                id={`atleta-telefone-${a.id}`}
                                label="Telefone"
                                value={a.telefone}
                                onChange={(e) => atualizarAtleta(a.id, "telefone", e.target.value)}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label
                                htmlFor={`atleta-saude-${a.id}`}
                                className="text-sm font-medium text-slate-700 dark:text-slate-200"
                              >
                                Observações de saúde e restrições
                              </label>
                              <textarea
                                id={`atleta-saude-${a.id}`}
                                rows={2}
                                placeholder="Ex.: alergia a látex, não pode nadar em água fria..."
                                value={a.observacoesSaude}
                                onChange={(e) =>
                                  atualizarAtleta(a.id, "observacoesSaude", e.target.value)
                                }
                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {perfil.tipoConta === "responsavel" && (
                      <button
                        type="button"
                        onClick={adicionarAtleta}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3.5 text-sm font-medium text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue dark:border-slate-700 dark:text-slate-400"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar atleta
                      </button>
                    )}
                  </div>

                  {erro && (
                    <p role="alert" className="text-sm text-red-500">
                      {erro}
                    </p>
                  )}

                  <div className="mt-2 flex justify-between">
                    <Button type="button" variant="ghost" onClick={() => setEtapa("perfil")}>
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                    <Button type="submit">
                      Continuar
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* Etapa 3 — Acesso */}
              {etapa === "acesso" && (
                <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      id="senha"
                      type="password"
                      label="Senha"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                    <Input
                      id="confirmarSenha"
                      type="password"
                      label="Confirmar senha"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                    />
                  </div>

                  {erro && (
                    <p role="alert" className="text-sm text-red-500">
                      {erro}
                    </p>
                  )}

                  <div className="mt-2 flex justify-between">
                    <Button type="button" variant="ghost" onClick={() => setEtapa("atletas")}>
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                      Criar conta
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-brand-blue hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
