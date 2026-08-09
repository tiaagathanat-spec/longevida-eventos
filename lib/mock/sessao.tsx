"use client";

// Sessão mock do Portal do Atleta.
//
// A autenticação real (Supabase Auth) fica no cookie/servidor; aqui
// guardamos apenas o perfil exibido nas telas (nome + e-mail) para os
// módulos mockados poderem filtrar os dados certos (Meus Atletas,
// Minhas Inscrições, Meus Resultados).
//
// Começa com o responsável de demonstração ("Cláudia Costa"). Após um
// cadastro de primeiro acesso, `definirSessao` troca para o novo
// usuário. Substituir por `getUsuarioAtual()` (lib/auth.ts) quando o
// login real governar os dados.

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type Sessao = {
  nome: string;
  email: string;
};

type SessaoContextValue = {
  sessao: Sessao;
  definirSessao: (sessao: Sessao) => void;
};

const SessaoContext = createContext<SessaoContextValue | null>(null);

const CHAVE_SESSAO = "longevida:sessao";

const SESSAO_INICIAL: Sessao = {
  nome: "Cláudia Costa",
  email: "claudia.costa@exemplo.com",
};

// Restaura a sessão da última visita (demo). Substituir pela leitura do
// usuário autenticado do Supabase (lib/auth.ts) quando o login real
// governar os dados.
function carregarSessaoSalva(): Sessao {
  try {
    const salva = window.localStorage.getItem(CHAVE_SESSAO);
    if (salva) {
      const dados = JSON.parse(salva) as Partial<Sessao>;
      if (dados.nome && dados.email) {
        return { nome: dados.nome, email: dados.email };
      }
    }
  } catch {
    // localStorage indisponível — segue com o padrão.
  }
  return SESSAO_INICIAL;
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao>(carregarSessaoSalva);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    } catch {
      // localStorage indisponível — segue apenas em memória.
    }
  }, [sessao]);

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
