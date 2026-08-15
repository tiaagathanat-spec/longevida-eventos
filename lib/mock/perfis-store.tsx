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

const PERFIS_INICIAIS: Perfil[] = [
  {
    // Host de demonstração: mesmo e-mail do login, com perfil de
    // responsável para testar o Portal do Atleta (meus atletas,
    // inscrições, resultados).
    id: "host",
    tipoConta: "responsavel",
    nome: "Agatha Tanat",
    email: "tiaagathanat@gmail.com",
    dataNascimento: "1990-05-20",
    genero: "feminino",
    cpf: "321.654.987-00",
    telefone: "(11) 97777-0000",
    endereco: "Av. das Nações, 500 — São Paulo/SP",
    contatoEmergenciaNome: "Felipe Tanat",
    contatoEmergenciaTelefone: "(11) 96666-0000",
    observacoesSaude: "Sem restrições.",
  },
  {
    id: "1",
    tipoConta: "responsavel",
    nome: "Cláudia Costa",
    email: "claudia.costa@exemplo.com",
    dataNascimento: "1985-06-14",
    genero: "feminino",
    cpf: "123.456.789-00",
    telefone: "(11) 98888-1234",
    endereco: "Rua das Flores, 123 — São Paulo/SP",
    contatoEmergenciaNome: "Ricardo Costa",
    contatoEmergenciaTelefone: "(11) 97777-0001",
    observacoesSaude: "Sem restrições.",
  },
];

export function PerfisProvider({ children }: { children: ReactNode }) {
  const {
    dados: perfis,
    setDados: setPerfis,
    pronto,
    erro,
  } = usePersistencia<Perfil>(
    "app_perfis",
    PERFIS_INICIAIS,
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
