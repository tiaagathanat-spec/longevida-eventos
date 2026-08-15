"use client";

// Store temporário do módulo de Funcionários/Staff, em memória
// (Context + useState). Mesmo padrão dos demais módulos: substituir por
// Server Actions + Prisma quando o backend real entrar.
//
// Um "Funcionário" é um usuário da equipe de organização vinculado a uma
// organização com um papel (organizador, cronometragem, financeiro...).
// Corresponde às tabelas `usuarios` (tipo_conta = 'staff') +
// `organizacao_usuarios` da modelagem de produção.
//
// O papel efetivo do usuário logado dentro da área de Organização vem do
// vínculo `organizacao_usuarios` (ver useUsuarioOrganizacao). Aqui ficam
// apenas o cadastro/edição da equipe feitos pelo Admin.

import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from "react";
import { usePersistencia } from "@/lib/supabase/persistencia";
import type { PapelOrganizacao } from "@/types";

// Módulos que o Admin pode liberar ou bloquear para cada funcionário da
// organização. "Eventos" e "Dashboard" são sempre liberados.
export type ModuloOrganizacao =
  | "eventos"
  | "provas"
  | "inscritos"
  | "kits"
  | "resultados"
  | "classificacao"
  | "cronometragem"
  | "financeiro"
  | "configuracoes";

export const MODULOS_ORGANIZACAO: { chave: ModuloOrganizacao; label: string }[] = [
  { chave: "eventos", label: "Eventos" },
  { chave: "provas", label: "Provas" },
  { chave: "inscritos", label: "Atletas inscritos" },
  { chave: "kits", label: "Entrega de kits" },
  { chave: "resultados", label: "Lançar resultados" },
  { chave: "classificacao", label: "Classificação" },
  { chave: "cronometragem", label: "Cronometragem" },
  { chave: "financeiro", label: "Financeiro" },
  { chave: "configuracoes", label: "Configurações" },
];

// Permissões padrão por papel. O Admin pode ajustar caso a caso.
export const PERMISSOES_POR_PAPEL: Record<PapelOrganizacao, ModuloOrganizacao[]> = {
  administrador: MODULOS_ORGANIZACAO.map((m) => m.chave),
  organizador: [
    "eventos",
    "provas",
    "inscritos",
    "kits",
    "resultados",
    "classificacao",
  ],
  cronometragem: [
    "eventos",
    "provas",
    "resultados",
    "classificacao",
    "cronometragem",
  ],
  financeiro: ["eventos", "inscritos", "financeiro"],
  leitura: ["eventos", "provas", "inscritos", "classificacao"],
};

export type Funcionario = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  papel: PapelOrganizacao;
  organizacaoId: string;
  ativo: boolean;
  permissoes: ModuloOrganizacao[];
};

export const PAPEL_ORGANIZACAO_LABEL: Record<PapelOrganizacao, string> = {
  administrador: "Administrador",
  organizador: "Organizador",
  cronometragem: "Cronometragem",
  financeiro: "Financeiro",
  leitura: "Somente leitura",
};

export type OrganizacaoDemo = {
  id: string;
  nome: string;
  descricao: string;
};

export const ORGANIZACOES_DEMO: OrganizacaoDemo[] = [
  {
    id: "1",
    nome: "Espaço Longevida",
    descricao: "Organização principal dos eventos esportivos.",
  },
];

type FuncionariosContextValue = {
  funcionarios: Funcionario[];
  pronto: boolean;
  erro: string | null;
  obterPorId: (id: string) => Funcionario | undefined;
  criar: (dados: Omit<Funcionario, "id">) => Funcionario;
  atualizar: (id: string, dados: Omit<Funcionario, "id">) => void;
  atualizarPermissoes: (id: string, permissoes: ModuloOrganizacao[]) => void;
  excluir: (id: string) => void;
};

const FuncionariosContext = createContext<FuncionariosContextValue | null>(null);

const FUNCIONARIOS_INICIAIS: Funcionario[] = [
  {
    // Host de demonstração: acesso a todos os módulos. Também tem perfil
    // de atleta/responsável (perfis-store) para testar o Portal.
    id: "host",
    nome: "Agatha Tanat",
    email: "tiaagathanat@gmail.com",
    telefone: "(11) 97777-0000",
    papel: "administrador",
    organizacaoId: "1",
    ativo: true,
    permissoes: PERMISSOES_POR_PAPEL.administrador,
  },
  {
    id: "1",
    nome: "Ricardo Almeida",
    email: "ricardo.almeida@exemplo.com",
    telefone: "(11) 98888-0001",
    papel: "organizador",
    organizacaoId: "1",
    ativo: true,
    permissoes: PERMISSOES_POR_PAPEL.organizador,
  },
  {
    id: "2",
    nome: "Fernanda Souza",
    email: "fernanda.souza@exemplo.com",
    telefone: "(11) 98888-0002",
    papel: "cronometragem",
    organizacaoId: "1",
    ativo: true,
    permissoes: PERMISSOES_POR_PAPEL.cronometragem,
  },
  {
    id: "3",
    nome: "Marcos Oliveira",
    email: "marcos.oliveira@exemplo.com",
    telefone: "(11) 98888-0003",
    papel: "financeiro",
    organizacaoId: "1",
    ativo: false,
    permissoes: PERMISSOES_POR_PAPEL.financeiro,
  },
];

function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

export function FuncionariosProvider({ children }: { children: ReactNode }) {
  const {
    dados: funcionarios,
    setDados: setFuncionarios,
    pronto,
    erro,
  } = usePersistencia<Funcionario>(
    "app_funcionarios",
    FUNCIONARIOS_INICIAIS,
    { ordem: "id" }
  );

  const value = useMemo<FuncionariosContextValue>(
    () => ({
      funcionarios,
      pronto,
      erro,
      obterPorId: (id) => funcionarios.find((f) => f.id === id),
      criar: (dados) => {
        const novo: Funcionario = { id: gerarId(), ...dados };
        setFuncionarios((atual) => [...atual, novo]);
        return novo;
      },
      atualizar: (id, dados) => {
        setFuncionarios((atual) =>
          atual.map((f) => (f.id === id ? { id, ...dados } : f))
        );
      },
      atualizarPermissoes: (id, permissoes) => {
        setFuncionarios((atual) =>
          atual.map((f) => (f.id === id ? { ...f, permissoes } : f))
        );
      },
      excluir: (id) => {
        setFuncionarios((atual) => atual.filter((f) => f.id !== id));
      },
    }),
    [funcionarios, pronto, erro]
  );

  return (
    <FuncionariosContext.Provider value={value}>{children}</FuncionariosContext.Provider>
  );
}

export function useFuncionarios() {
  const ctx = useContext(FuncionariosContext);
  if (!ctx) {
    throw new Error("useFuncionarios precisa ser usado dentro de <FuncionariosProvider>");
  }
  return ctx;
}
