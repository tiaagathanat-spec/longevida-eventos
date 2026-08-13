"use client";

// Sessão do Portal do Atleta, baseada no usuário autenticado do Supabase.
//
// A autenticação real fica no cookie/servidor (lib/supabase/middleware.ts);
// aqui guardamos apenas o perfil exibido nas telas (nome + e-mail) para os
// módulos mockados poderem filtrar os dados certos (Meus Atletas, Minhas
// Inscrições, Meus Resultados).
//
// O nome vem, em ordem de prioridade:
//   1) da tabela `usuarios` (criada no signup pelo trigger da 0002 e
//      atualizada em /portal/perfil) — fonte de verdade do RLS por nome;
//   2) dos metadados do usuário no Supabase (user_metadata);
//   3) do prefixo do e-mail.
// `definirSessao` é usado logo após um cadastro/edição de perfil para já
// refletir o nome na tela.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type Sessao = {
  nome: string;
  email: string;
};

type SessaoContextValue = {
  sessao: Sessao;
  definirSessao: (sessao: Sessao) => void;
};

const SessaoContext = createContext<SessaoContextValue | null>(null);

const SESSAO_VAZIA: Sessao = { nome: "", email: "" };

function nomeDoUsuario(
  metadados: Record<string, unknown> | null,
  email: string
): string {
  const candidatos = ["nome", "full_name", "name"];
  for (const chave of candidatos) {
    const valor = metadados?.[chave];
    if (typeof valor === "string" && valor.trim()) return valor.trim();
  }
  const parte = email.split("@")[0] ?? "";
  return parte;
}

// Nome efetivo da sessão: prioriza a tabela `usuarios` (mesma origem que o
// RLS usa para casar responsavel_nome), caindo para os metadados do auth e,
// por fim, para o prefixo do e-mail.
async function nomeDoUsuarioEfetivo(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  email: string,
  metadados: Record<string, unknown> | null
): Promise<string> {
  const { data } = await supabase
    .from("usuarios")
    .select("nome")
    .eq("id", userId)
    .maybeSingle();
  const nomeBanco = (data as { nome?: string } | null)?.nome?.trim();
  if (nomeBanco) return nomeBanco;
  return nomeDoUsuario(metadados, email);
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao>(SESSAO_VAZIA);

  useEffect(() => {
    let ativo = true;
    const supabase = createClient();

    async function sincronizarComAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!ativo) return;
      if (!user?.email) {
        setSessao(SESSAO_VAZIA);
        return;
      }
      const nome = await nomeDoUsuarioEfetivo(
        supabase,
        user.id,
        user.email,
        (user.user_metadata as Record<string, unknown> | null) ?? null
      );
      if (!ativo) return;
      setSessao({ nome, email: user.email });
    }

    sincronizarComAuth();

    const { data: inscricao } = supabase.auth.onAuthStateChange(
      async (_evento, session) => {
        const user = session?.user;
        if (!user?.email) {
          if (ativo) setSessao(SESSAO_VAZIA);
          return;
        }
        const nome = await nomeDoUsuarioEfetivo(
          supabase,
          user.id,
          user.email,
          (user.user_metadata as Record<string, unknown> | null) ?? null
        );
        if (!ativo) return;
        setSessao({ nome, email: user.email });
      }
    );

    return () => {
      ativo = false;
      inscricao.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessaoContextValue>(
    () => ({ sessao, definirSessao: setSessao }),
    [sessao]
  );

  return <SessaoContext.Provider value={value}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  const ctx = useContext(SessaoContext);
  if (!ctx) {
    throw new Error("useSessao precisa ser usado dentro de <SessaoProvider>");
  }
  return ctx;
}
