"use client";

// Redefinição de senha via link enviado por e-mail.
//
// Fluxo: o usuário clica em "Esqueci minha senha" (login) → recebe o link
// de redefinição no e-mail → o link chega aqui com um `code` (fluxo PKCE).
// A página troca o code por uma sessão de recuperação e exibe o formulário
// para definir a nova senha, que é salva com supabase.auth.updateUser.

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { MailCheck, ArrowLeft, KeyRound, AlertCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoLongevida } from "@/components/brand/logo-longevida";

type Estado = "carregando" | "invalido" | "pronto" | "salvando" | "sucesso";

export default function AtualizarSenhaPage() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // Troca o code do link (e-mail) por uma sessão de recuperação de senha.
  useEffect(() => {
    let cancelado = false;

    async function trocarCodigo() {
      const supabase = createClient();
      const codigo = new URLSearchParams(window.location.search).get("code");

      if (!codigo) {
        // Fluxo sem code explícito: pode haver sessão de recuperação ativa
        // (ex.: fluxo por fragmento de URL). Usa a sessão existente.
        const { data } = await supabase.auth.getSession();
        if (cancelado) return;
        setEstado(data.session ? "pronto" : "invalido");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(codigo);
      if (cancelado) return;
      setEstado(error ? "invalido" : "pronto");
    }

    trocarCodigo();
    return () => {
      cancelado = true;
    };
  }, []);

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

    setEstado("salvando");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: senha });

      if (error) {
        setErro(mensagemErro(error.message));
        setEstado("pronto");
        return;
      }

      // Encerra a sessão de recuperação para o usuário entrar com a nova senha.
      await supabase.auth.signOut();
      setEstado("sucesso");
    } catch {
      setErro("Não foi possível atualizar a senha agora. Tente novamente.");
      setEstado("pronto");
    }
  }

  function mensagemErro(mensagem: string) {
    const m = mensagem.toLowerCase();
    if (m.includes("password")) return "A senha não atende aos requisitos.";
    return mensagem;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-6 dark:bg-slate-900">
      {/* Identificação — canto superior direito */}
      <div className="absolute right-5 top-5 z-20">
        <LogoLongevida className="h-14 w-auto" />
      </div>
      {/* Marca d'água */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <LogoLongevida watermark className="h-[420px] w-auto opacity-[0.05]" />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950">
          {estado === "carregando" && (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Validando o link de redefinição…
              </p>
            </div>
          )}

          {estado === "invalido" && (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-white">
                Link inválido ou expirado
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                O link de redefinição de senha não é válido ou já foi usado.
                Solicite um novo link para continuar.
              </p>
              <Link href="/recuperar-senha" className="mt-8 inline-block w-full">
                <Button className="w-full">
                  <KeyRound className="h-4 w-4" />
                  Solicitar novo link
                </Button>
              </Link>
              <Link
                href="/login"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </div>
          )}

          {estado === "sucesso" && (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                <Check className="h-7 w-7" />
              </div>
              <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-white">
                Senha atualizada
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Sua senha foi redefinida com sucesso. Entre agora com a nova senha.
              </p>
              <Link href="/login" className="mt-8 inline-block w-full">
                <Button className="w-full">Ir para o login</Button>
              </Link>
            </div>
          )}

          {(estado === "pronto" || estado === "salvando") && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                <KeyRound className="h-7 w-7" />
              </div>
              <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-white">
                Definir nova senha
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Escolha uma nova senha para a sua conta.
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
                <Input
                  id="senha"
                  type="password"
                  label="Nova senha"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <Input
                  id="confirmarSenha"
                  type="password"
                  label="Confirmar nova senha"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />

                {erro && (
                  <p role="alert" className="text-sm text-red-500">
                    {erro}
                  </p>
                )}

                <Button type="submit" isLoading={estado === "salvando"} className="mt-2 w-full">
                  Salvar nova senha
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
