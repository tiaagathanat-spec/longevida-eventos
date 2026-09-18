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
import { normalizarNomePessoa } from "@/lib/utils/nomes";

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
    [],
    { ordem: "id" }
  );

  const value = useMemo<AtletasContextValue>(
    () => ({
      atletas,
      pronto,
      erro,
      obterPorId: (id) => atletas.find((a) => a.id === id),
      criar: (dados) => {
        const dadosNormalizados = {
          ...dados,
          nome: normalizarNomePessoa(dados.nome),
          responsavelNome: normalizarNomePessoa(dados.responsavelNome),
          contatoEmergenciaNome: normalizarNomePessoa(dados.contatoEmergenciaNome ?? ""),
          responsavelTelefone: dados.responsavelTelefone,
        };
        const novo: Atleta = { id: gerarId(), ...dadosNormalizados };
        setAtletas((atual) => [novo, ...atual]);
        return novo;
      },
      atualizar: (id, dados) => {
        const dadosNormalizados = { ...dados };
        if (dadosNormalizados.nome) dadosNormalizados.nome = normalizarNomePessoa(dadosNormalizados.nome);
        if (dadosNormalizados.responsavelNome) dadosNormalizados.responsavelNome = normalizarNomePessoa(dadosNormalizados.responsavelNome);
        if (dadosNormalizados.contatoEmergenciaNome) dadosNormalizados.contatoEmergenciaNome = normalizarNomePessoa(dadosNormalizados.contatoEmergenciaNome);
        setAtletas((atual) =>
          atual.map((a) => (a.id === id ? { id, ...dadosNormalizados } : a))
        );
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
