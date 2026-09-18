import { describe, expect, it, vi } from "vitest";
import {
  eErroEmailJaCadastrado,
  eErroEmailNaoConfirmado,
  urlCallbackConfirmacao,
  reenviarConfirmacao,
  MENSAGEM_REENVIO_ENVIADO,
  MENSAGEM_LOGIN_NAO_CONFIRMADO,
} from "@/lib/auth-confirmacao";

describe("eErroEmailNaoConfirmado", () => {
  it("identifica mensagens do Supabase de e-mail não confirmado", () => {
    expect(eErroEmailNaoConfirmado("Email not confirmed")).toBe(true);
    expect(eErroEmailNaoConfirmado("email_not_confirmed")).toBe(true);
    expect(eErroEmailNaoConfirmado("Please confirm your email")).toBe(true);
    expect(eErroEmailNaoConfirmado("Invalid login credentials")).toBe(false);
  });
});

describe("eErroEmailJaCadastrado", () => {
  it("identifica mensagens do Supabase de e-mail duplicado", () => {
    expect(eErroEmailJaCadastrado("User already registered")).toBe(true);
    expect(eErroEmailJaCadastrado("A user with this email address has already been registered")).toBe(true);
    expect(eErroEmailJaCadastrado("Email not confirmed")).toBe(false);
  });
});

describe("urlCallbackConfirmacao", () => {
  it("monta callback de confirmação levando ao portal após o code exchange", () => {
    expect(urlCallbackConfirmacao("http://localhost:3000")).toBe(
      "http://localhost:3000/api/auth?next=/portal/dashboard"
    );
    expect(urlCallbackConfirmacao("https://longevida.vercel.app")).toBe(
      "https://longevida.vercel.app/api/auth?next=/portal/dashboard"
    );
  });
});

describe("reenviarConfirmacao", () => {
  function stub(resend: (payload: unknown) => Promise<{ error: { message: string } | null }>) {
    return { auth: { resend } } as never;
  }

  it("envia reenvio e informa sucesso quando não há erro", async () => {
    const supabase = stub(
      vi.fn(async () => {
        return { error: null };
      })
    );
    const resultado = await reenviarConfirmacao(supabase, "a@b.com", "https://x.app");
    expect(resultado.ok).toBe(true);
    expect(resultado.mensagem).toBe(MENSAGEM_REENVIO_ENVIADO);
  });

  it("repassa o e-mail e o callback de confirmação ao resend nativo", async () => {
    const resend = vi.fn(async () => ({ error: null }));
    await reenviarConfirmacao({ auth: { resend } } as never, "a@b.com", "http://localhost:3000");
    expect(resend).toHaveBeenCalledWith({
      type: "signup",
      email: "a@b.com",
      options: { emailRedirectTo: "http://localhost:3000/api/auth?next=/portal/dashboard" },
    });
  });

  it("orienta a conferir a caixa de entrada quando o Supabase limita o reenvio", async () => {
    const supabase = stub(
      vi.fn(async () => ({ error: { message: "For security purposes, you can only request this once every 60 seconds" } }))
    );
    const resultado = await reenviarConfirmacao(supabase, "a@b.com", "https://x.app");
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toContain("Aguardando um instante");
  });

  it("retorna aviso de confirmação pendente em erro específico", async () => {
    const supabase = stub(
      vi.fn(async () => ({ error: { message: "Email not confirmed" } }))
    );
    const resultado = await reenviarConfirmacao(supabase, "a@b.com", "https://x.app");
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toBe(MENSAGEM_LOGIN_NAO_CONFIRMADO);
  });

  it("retorna mensagem genérica em erro inesperado ou exceção", async () => {
    const emErro = await reenviarConfirmacao(
      stub(vi.fn(async () => ({ error: { message: "network glitch" } }))),
      "a@b.com",
      "https://x.app"
    );
    expect(emErro.ok).toBe(false);
    expect(emErro.mensagem).toContain("Não foi possível reenviar");

    const excecao = await reenviarConfirmacao(
      stub(vi.fn(async () => {
        throw new Error("boom");
      })),
      "a@b.com",
      "https://x.app"
    );
    expect(excecao.ok).toBe(false);
    expect(excecao.mensagem).toContain("Não foi possível reenviar");
  });
});