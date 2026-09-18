"use client";

// Tela/aviso de "confirmação de e-mail pendente", usada em dois lugares:
//   - Cadastro, logo após criar a conta (link ainda não confirmado);
//   - Login, quando alguém tenta entrar antes de confirmar o e-mail.
//
// Deixa explícito que o acesso só será liberado depois da confirmação,
// mostra o e-mail cadastrado, orienta sobre spam/lixo eletrônico e
// oferece o reenvio do link (fluxo nativo Supabase).
import { useState } from "react";
import Link from "next/link";
import { MailCheck, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MENSAGEM_LOGIN_NAO_CONFIRMADO,
  reenviarConfirmacao,
} from "@/lib/auth-confirmacao";
import { createClient } from "@/lib/supabase/client";

type Variante = "cadastro" | "login";

export function AguardandoConfirmacaoEmail({
  email,
  variante = "cadastro",
  recadastro = false,
}: {
  email: string;
  /** "login" é usado no bloqueio de acesso antes da confirmação. */
  variante?: Variante;
  /** True quando o e-mail já existe pendente (repetição de cadastro). */
  recadastro?: boolean;
}) {
  const [reenviando, setReenviando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function reenviar() {
    setReenviando(true);
    setFeedback(null);
    const supabase = createClient();
    const resultado = await reenviarConfirmacao(supabase, email, window.location.origin);
    setFeedback(resultado.mensagem);
    setReenviando(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
          <MailCheck className="h-7 w-7" />
        </div>

        {variante === "login" ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Confirme o seu e-mail
            </h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {MENSAGEM_LOGIN_NAO_CONFIRMADO}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {recadastro ? "Já existe um cadastro neste e-mail." : "Cadastro realizado com sucesso!"}
            </h1>
            {recadastro ? (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Este e-mail ainda não confirmou o cadastro. Confirme o link que enviamos para
                liberar o seu acesso — não é preciso criar outra conta.
              </p>
            ) : (
              <>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  Enviamos um link de confirmação para o seu e-mail.
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Acesse seu Gmail/e-mail pessoal, abra a mensagem enviada pelo{" "}
                  <strong className="font-semibold">Longevida Eventos</strong> e confirme seu
                  cadastro.
                </p>
              </>
            )}
          </>
        )}

        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          {variante === "login"
            ? "Enquanto o e-mail não for confirmado, o acesso permanece bloqueado."
            : "Somente após confirmar o e-mail será possível entrar no site."}
        </p>
      </div>

      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left text-sm leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-300">
        <p className="font-semibold">Verifique a caixa de entrada:</p>
        <ul className="mt-1.5 list-inside list-disc space-y-1">
          <li>spam/lixo eletrônico</li>
          <li>promoções</li>
        </ul>
        <p className="mt-3">
          Confira o e-mail cadastrado: <strong className="font-semibold break-all">{email}</strong>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <Button
          type="button"
          variant="secondary"
          onClick={reenviar}
          disabled={reenviando}
          className="w-full"
        >
          {reenviando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Reenviar e-mail de confirmação
        </Button>
        {feedback && (
          <p
            role="status"
            className="mt-2 text-center text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            {feedback}
          </p>
        )}
        <p
          role="note"
          className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"
        >
          Sem a confirmação do e-mail, o acesso ao sistema não é liberado.
        </p>
      </div>

      <div className="text-center">
        <Link href="/login" className="inline-block">
          <Button>Ir para o login</Button>
        </Link>
      </div>
    </div>
  );
}