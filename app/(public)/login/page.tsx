"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSessao } from "@/lib/mock/sessao";
import { usePerfis } from "@/lib/mock/perfis-store";
import { useFuncionarios } from "@/lib/mock/funcionarios-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoLongevida } from "@/components/brand/logo-longevida";

export default function LoginPage() {
  const router = useRouter();
  const { definirSessao } = useSessao();
  const { obterPorEmail } = usePerfis();
  const { funcionarios, entrarComo } = useFuncionarios();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    if (!email || !senha) {
      setErro("Preencha e-mail e senha para continuar.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setErro("E-mail ou senha incorretos. Tente novamente.");
        return;
      }

      // Sincroniza a sessão mock (Portal) e o funcionário ativo
      // (Organização) com o e-mail logado, para que o trocador de perfil
      // e os filtros por responsável/funcionário já comecem no lugar certo.
      const perfil = obterPorEmail(email);
      if (perfil) definirSessao({ nome: perfil.nome, email: perfil.email });

      const funcionario = funcionarios.find(
        (f) => f.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (funcionario) entrarComo(funcionario.id);

      // Se chegamos aqui através de um link de acesso a uma rota
      // protegida (o middleware grava ?redirect=), volta para onde o
      // usuário estava tentando ir.
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
        router.push(redirect);
        router.refresh();
        return;
      }

      // Redirecionamento por perfil. O papel vem do banco: o admin da
      // plataforma tem vínculo de staff com papel "administrador" em
      // alguma organização; a equipe de organização tem algum outro
      // papel; atletas e responsáveis vão para o Portal.
      const destino = await destinoPorPerfil(supabase, data.user.id);
      router.push(destino);
      router.refresh();
    } catch {
      setErro("Não foi possível entrar agora. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  async function destinoPorPerfil(supabase: ReturnType<typeof createClient>, usuarioId: string) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("tipo_conta")
      .eq("id", usuarioId)
      .maybeSingle();

    const { data: vinculos } = await supabase
      .from("organizacao_usuarios")
      .select("papel")
      .eq("usuario_id", usuarioId);

    const tipoConta = usuario?.tipo_conta as string | undefined;
    const papeis = (vinculos ?? []).map((v) => v.papel);

    if (tipoConta === "staff" || papeis.length > 0) {
      if (papeis.includes("administrador")) return "/admin/dashboard";
      return "/organizacao/dashboard";
    }

    return "/portal/dashboard";
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

        <span className="relative text-lg font-semibold tracking-tight">
          Longevida Eventos
        </span>

        <div className="relative max-w-sm">
          <h1 className="text-3xl font-semibold leading-tight">
            Cada prova, cada tempo, cada conquista — em um só lugar.
          </h1>
          <p className="mt-4 text-sm text-white/80">
            Inscrições, cronometragem e resultados dos eventos do Espaço
            Longevida, organizados do início ao fim.
          </p>
        </div>

        <span className="relative text-xs text-white/60">
          Espaço Longevida
        </span>
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

        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Longevida Eventos
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Entrar
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Acesse sua conta para ver eventos, inscrições e resultados.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
            <Input
              id="email"
              type="email"
              label="E-mail"
              placeholder="voce@exemplo.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="senha"
                  className="text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Senha
                </label>
                <Link
                  href="/recuperar-senha"
                  className="text-xs font-medium text-brand-blue hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            {erro && (
              <p role="alert" className="text-sm text-red-500">
                {erro}
              </p>
            )}

            <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
              Entrar
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Primeiro acesso?
          </p>
          <Link href="/cadastro" className="mt-2 block">
            <Button variant="secondary" className="w-full">
              Criar conta de atleta ou responsável
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
