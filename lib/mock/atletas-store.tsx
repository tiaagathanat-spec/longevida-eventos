"use client";

// Store temporário do módulo de Atletas, em memória (Context + useState).
// Mesmo padrão dos demais módulos: substituir por Server Actions + Prisma
// quando o backend real estiver conectado.
//
// Corresponde à tabela `usuarios` (perfil = atleta) da modelagem da
// Etapa 2, com o vínculo opcional de responsável (`responsaveis_atletas`)
// representado aqui como um campo de texto — será relacional quando o
// módulo de autenticação/usuários existir de verdade.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";

export type Atleta = {
  id: string;
  nome: string;
  dataNascimento: string; // ISO date, vazio se não informado
  categoriaId: string; // referencia lib/mock/categorias-store
  responsavelNome: string; // vazio se o próprio atleta é maior de idade
  email: string;
  telefone: string;
  // Dados completos coletados no cadastro de primeiro acesso.
  genero?: "masculino" | "feminino" | "outro" | "";
  cpf?: string;
  endereco?: string;
  contatoEmergenciaNome?: string;
  contatoEmergenciaTelefone?: string;
  observacoesSaude?: string;
  responsavelTelefone?: string;
  // Dados do responsável legal exigidos para menores de idade (regra
  // central: menores de 18 precisam de responsável legal).
  responsavelCpf?: string;
  parentesco?: string;
};

type AtletasContextValue = {
  atletas: Atleta[];
  pronto: boolean;
  erro: string | null;
  obterPorId: (id: string) => Atleta | undefined;
  criar: (dados: Omit<Atleta, "id">) => Atleta;
  atualizar: (id: string, dados: Omit<Atleta, "id">) => void;
  excluir: (id: string) => void;
};

const AtletasContext = createContext<AtletasContextValue | null>(null);

const ATLETAS_INICIAIS: Atleta[] = [
  {
    id: "1",
    nome: "Marina Costa",
    dataNascimento: "2013-04-12",
    categoriaId: "1",
    responsavelNome: "Cláudia Costa",
    email: "claudia.costa@exemplo.com",
    telefone: "(11) 98888-1234",
  },
  {
    id: "2",
    nome: "Beatriz Lima",
    dataNascimento: "2011-09-02",
    categoriaId: "3",
    responsavelNome: "Cláudia Costa",
    email: "claudia.costa@exemplo.com",
    telefone: "(11) 97777-5678",
  },
  {
    id: "3",
    nome: "João Pedro Santos",
    dataNascimento: "1994-01-20",
    categoriaId: "4",
    responsavelNome: "",
    email: "joaopedro@exemplo.com",
    telefone: "(11) 96666-9012",
  },
  {
    id: "4",
    nome: "Rafael Andrade",
    dataNascimento: "2012-05-30",
    categoriaId: "3",
    responsavelNome: "Cláudia Costa",
    email: "claudia.costa@exemplo.com",
    telefone: "(11) 95555-3456",
  },
  {
    // Atletas vinculados ao host de demonstração (Agatha Tanat), para
    // testar inscrições no Portal do Atleta.
    id: "5",
    nome: "Ana Tanat",
    dataNascimento: "2014-02-10",
    categoriaId: "1",
    responsavelNome: "Agatha Tanat",
    email: "tiaagathanat@gmail.com",
    telefone: "(11) 97777-0000",
  },
  {
    id: "6",
    nome: "Miguel Tanat",
    dataNascimento: "2012-08-25",
    categoriaId: "3",
    responsavelNome: "Agatha Tanat",
    email: "tiaagathanat@gmail.com",
    telefone: "(11) 97777-0000",
  },
];

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function AtletasProvider({ children }: { children: ReactNode }) {
  const {
    dados: atletas,
    setDados: setAtletas,
    pronto,
    erro,
  } = usePersistencia<Atleta>(
    "app_atletas",
    ATLETAS_INICIAIS,
    { ordem: "id" }
  );

  const value = useMemo<AtletasContextValue>(
    () => ({
      atletas,
      pronto,
      erro,
      obterPorId: (id) => atletas.find((a) => a.id === id),
      criar: (dados) => {
        const novo: Atleta = { id: gerarId(), ...dados };
        setAtletas((atual) => [novo, ...atual]);
        return novo;
      },
      atualizar: (id, dados) => {
        setAtletas((atual) => atual.map((a) => (a.id === id ? { id, ...dados } : a)));
      },
      excluir: (id) => {
        setAtletas((atual) => atual.filter((a) => a.id !== id));
      },
    }),
    [atletas, pronto, erro]
  );

  return <AtletasContext.Provider value={value}>{children}</AtletasContext.Provider>;
}

export function useAtletas() {
  const ctx = useContext(AtletasContext);
  if (!ctx) {
    throw new Error("useAtletas precisa ser usado dentro de <AtletasProvider>");
  }
  return ctx;
}
