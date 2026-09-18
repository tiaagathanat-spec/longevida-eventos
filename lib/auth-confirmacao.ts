// Fluxo obrigatório de confirmação de e-mail (Supabase Auth nativo).
//
// Centraliza as regras de texto/exibição e o reenvio do link de
// confirmação usados pelo Cadastro e pelo Login. Funções puras (sem
// dependência de navegador/servidor) para permitir testes unitários.
import type { SupabaseClient } from "@supabase/supabase-js";

/** Mensagem exibida no Login quando a conta ainda não confirmou o e-mail. */
export const MENSAGEM_LOGIN_NAO_CONFIRMADO =
  "Seu e-mail ainda não foi confirmado. Acesse seu e-mail pessoal e clique no link de confirmação enviado pelo Longevida Eventos para liberar seu acesso.";

/** Mensagem exibida no Cadastro quando o e-mail é confirmado e o cadastro é repetido. */
export const MENSAGEM_EMAIL_JA_CONFIRMADO =
  "Este e-mail já está cadastrado e confirmado. Acesse o login para entrar.";

export function eErroEmailNaoConfirmado(mensagem: string): boolean {
  const m = mensagem.toLowerCase();
  return m.includes("not confirmed") || m.includes("email_not_confirmed") || m.includes("confirm your email");
}

export function eErroEmailJaCadastrado(mensagem: string): boolean {
  const m = mensagem.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already exists")
  );
}

/**
 * URL para onde o Supabase leva o navegador depois que o usuário confirma
 * o e-mail. Cai no callback de troca de código (/api/auth) — mesmo fluxo
 * de code exchange usado por OAuth/recuperação — e segue para o Portal.
 */
export function urlCallbackConfirmacao(origin: string): string {
  return `${origin}/api/auth?next=/portal/dashboard`;
}

export type ResultadoReenvio = { ok: boolean; mensagem: string };

export const MENSAGEM_REENVIO_ENVIADO =
  "Reenviamos o link de confirmação. Confira sua caixa de entrada e também a pasta de spam/lixo eletrônico.";

/**
 * Reenvia o link de confirmação de cadastro (fluxo nativo Supabase:
 * resend de tipo "signup"). Retorna um resultado em pt-BR pronto para
 * exibição.
 */
export async function reenviarConfirmacao(
  supabase: Pick<SupabaseClient, "auth">,
  email: string,
  origin: string
): Promise<ResultadoReenvio> {
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: urlCallbackConfirmacao(origin) },
    });

    if (error) {
      const m = (error.message ?? "").toLowerCase();
      if (m.includes("rate") || m.includes("too many") || m.includes("limit") || m.includes("seconds")) {
        return {
          ok: false,
          mensagem:
            "Aguardando um instante para reenviar. Você já recebeu um link recentemente — confira a caixa de entrada primeiro.",
        };
      }
      if (eErroEmailNaoConfirmado(error.message ?? "")) {
        return { ok: false, mensagem: MENSAGEM_LOGIN_NAO_CONFIRMADO };
      }
      return {
        ok: false,
        mensagem: "Não foi possível reenviar o e-mail agora. Tente novamente em instantes.",
      };
    }

    return { ok: true, mensagem: MENSAGEM_REENVIO_ENVIADO };
  } catch {
    return {
      ok: false,
      mensagem: "Não foi possível reenviar o e-mail agora. Tente novamente em instantes.",
    };
  }
}