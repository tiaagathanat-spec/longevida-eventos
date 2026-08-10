"use client";

// Sessão do Portal do Atleta, baseada no usuário autenticado do Supabase.
//
// A autenticação real fica no cookie/servidor (lib/supabase/middleware.ts);
// aqui guardamos apenas o perfil exibido nas telas (nome + e-mail) para os
// módulos mockados poderem filtrar os dados certos (Meus Atletas, Minhas
// Inscrições, Meus Resultados).
//
// O nome vem do cadastro do usuário no Supabase (user_metadata) ou do
// prefixo do e-mail. `definirSessao` é usado logo após um cadastro/edição
// de perfil para já refletir o nome na tela.

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
      setSessao({
        nome: nomeDoUsuario(
          (user.user_metadata as Record<string, unknown> | null) ?? null,
          user.email
        ),
        email: user.email,
      });
    }

    sincronizarComAuth();

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (!ativo) return;
      const user = session?.user;
      if (!user?.email) {
        setSessao(SESSAO_VAZIA);
        return;
      }
      setSessao({
        nome: nomeDoUsuario(
          (user.user_metadata as Record<string, unknown> | null) ?? null,
          user.email
        ),
        email: user.email,
      });
    });

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
