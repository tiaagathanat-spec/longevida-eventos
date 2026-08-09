"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { MailCheck, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoLongevida } from "@/components/brand/logo-longevida";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    if (!email.trim()) {
      setErro("Informe seu e-mail para recuperar a senha.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/atualizar-senha`,
      });

      if (error) {
        setErro("Não foi possível enviar o link. Confira o e-mail e tente novamente.");
        return;
      }

      setEnviado(true);
    } catch {
      setErro("Não foi possível enviar o link agora. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  if (enviado) {
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
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-white">
            Verifique seu e-mail
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Enviamos um link de redefinição de senha para{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>.
          </p>
          <Link href="/login" className="mt-8 inline-block">
            <Button type="button" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Button>
          </Link>
        </div>
      </main>
    );
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Recuperar senha
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Informe o e-mail da sua conta e enviaremos um link para criar
            uma nova senha.
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

            {erro && (
              <p role="alert" className="text-sm text-red-500">
                {erro}
              </p>
            )}

            <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
              Enviar link de redefinição
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Lembrou a senha?{" "}
            <Link href="/login" className="font-medium text-brand-blue hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
