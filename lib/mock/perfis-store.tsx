"use client";

// Perfis registrados no cadastro de primeiro acesso (em memória).
// Mesmo padrão das demais stores: será substituído pelo banco real
// quando o backend entrar. Guarda o responsável ou o atleta que fez o
// cadastro, com os dados completos coletados na tela de Cadastro.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type TipoContaCadastro = "atleta" | "responsavel";

export type Perfil = {
  id: string;
  tipoConta: TipoContaCadastro;
  nome: string;
  email: string;
  dataNascimento: string;
  genero: "masculino" | "feminino" | "outro" | "";
  cpf: string;
  telefone: string;
  endereco: string;
  contatoEmergenciaNome: string;
  contatoEmergenciaTelefone: string;
  observacoesSaude: string;
  foto?: string; // data URL da foto de perfil (demo — em memória)
  responsavelNome?: string;
  responsavelTelefone?: string;
};

type PerfisContextValue = {
  perfis: Perfil[];
  pronto: boolean;
  erro: string | null;
  obterPorEmail: (email: string) => Perfil | undefined;
  criar: (dados: Omit<Perfil, "id">) => Perfil;
  atualizar: (email: string, dados: Partial<Omit<Perfil, "id">>) => void;
};

const PerfisContext = createContext<PerfisContextValue | null>(null);

export function PerfisProvider({ children }: { children: ReactNode }) {
  const {
    dados: perfis,
    setDados: setPerfis,
    pronto,
    erro,
  } = usePersistencia<Perfil>(
    "app_perfis",
    [],
    { ordem: "id" }
  );

  const value = useMemo<PerfisContextValue>(
    () => ({
      perfis,
      pronto,
      erro,
      obterPorEmail: (email) =>
        perfis.find((p) => p.email.toLowerCase() === email.trim().toLowerCase()),
      criar: (dados) => {
        const novo: Perfil = { id: String(Date.now()), ...dados };
        setPerfis((atual) => [...atual, novo]);
        return novo;
      },
      atualizar: (email, dados) => {
        const alvo = email.trim().toLowerCase();
        setPerfis((atual) =>
          atual.map((p) =>
            p.email.toLowerCase() === alvo ? { ...p, ...dados } : p
          )
        );
      },
    }),
    [perfis, pronto, erro]
  );

  return <PerfisContext.Provider value={value}>{children}</PerfisContext.Provider>;
}

export function usePerfis() {
  const ctx = useContext(PerfisContext);
  if (!ctx) {
    throw new Error("usePerfis precisa ser usado dentro de <PerfisProvider>");
  }
  return ctx;
}
