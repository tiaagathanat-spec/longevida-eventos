"use client";

// Identidade do usuário autenticado dentro da área de Organização.
//
// Substitui o "funcionário ativo" do modo demonstração ("entrar como"):
// cada pessoa tem UMA conta, e o papel da equipe vem do vínculo
// organização <-> usuário (`organizacao_usuarios`), consultado no
// Supabase com base no usuário logado. As permissões de módulos seguem
// o papel retornado pelo banco (PERMISSOES_POR_PAPEL).
//
// Um usuário PODE estar vinculado a mais de uma organização (ex.: o
// admin tem vínculo 'administrador' na Espaço Longevida e 'cronometragem'
// numa organização de teste). Nunca usamos `.maybeSingle()` aqui: quando
// há mais de um vínculo a consulta ERRA e o papel/organização caem para
// null — o que fazia a persistência "aparentar salvar" e sumir ao
// recarregar. O vínculo efetivo é escolhido de forma DETERMINÍSTICA pelo
// papel de maior privilégio (administrador > organizador > financeiro >
// cronometragem > leitura).

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MODULOS_ORGANIZACAO,
  PERMISSOES_POR_PAPEL,
  type ModuloOrganizacao,
} from "@/lib/mock/funcionarios-store";
import type { PapelOrganizacao } from "@/types";

export type UsuarioOrganizacao = {
  nome: string;
  email: string;
  telefone: string;
  papel: PapelOrganizacao | null;
  permissoes: ModuloOrganizacao[];
  // Organização REAL do vínculo do usuário autenticado em
  // organizacao_usuarios (uuid de organizacoes). Nunca vem de
  // localStorage, de seleção manual do cliente ou de valor fixo.
  organizacaoId: string | null;
  carregando: boolean;
};

type VinculoOrganizacao = {
  papel: PapelOrganizacao | null;
  organizacaoId: string | null;
};

// Prioridade do vínculo efetivo. Ordenação determinística — nunca
// dependemos da ordem que o banco devolve (LIMIT sem ORDER BY).
const PRIORIDADE_PAPEL: Record<string, number> = {
  administrador: 0,
  organizador: 1,
  financeiro: 2,
  cronometragem: 3,
  leitura: 4,
};

function melhorVinculo(vinculos: VinculoOrganizacao[]): VinculoOrganizacao {
  const validos = vinculos.filter((v) => v.papel && v.organizacaoId);
  validos.sort(
    (a, b) =>
      (PRIORIDADE_PAPEL[a.papel!] ?? 9) - (PRIORIDADE_PAPEL[b.papel!] ?? 9)
  );
  return validos[0] ?? { papel: null, organizacaoId: null };
}

// Todos os vínculos reais do usuário autenticado em organizacao_usuarios.
// Retorna vazio quando não autenticado, sem vínculos ou em erro — o
// chamador decide como reagir (não esconde o dado, só lista o que existe).
export async function listarVinculos(): Promise<VinculoOrganizacao[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("organizacao_usuarios")
    .select("papel, organizacao_id")
    .eq("usuario_id", user.id);

  if (error || !data) return [];

  return data.map((linha) => ({
    papel:
      typeof linha.papel === "string" && linha.papel in PERMISSOES_POR_PAPEL
        ? (linha.papel as PapelOrganizacao)
        : null,
    organizacaoId:
      typeof linha.organizacao_id === "string" ? linha.organizacao_id : null,
  }));
}

// Organização real do usuário autenticado (uuid), lida do vínculo
// organizacao_usuarios. Usada pelos stores (ex.: eventos-store) para
// gravar organizacao_id em dados que dependem da organização do usuário.
// Com múltiplos vínculos, devolve a organização do vínculo de maior
// privilégio (nunca o primeiro arbitrário do banco).
export async function buscarOrganizacaoAtual(): Promise<string | null> {
  return melhorVinculo(await listarVinculos()).organizacaoId;
}

const TODAS_PERMISSOES = MODULOS_ORGANIZACAO.map((m) => m.chave);

function nomeDoEmail(email: string): string {
  const parte = email.split("@")[0] ?? "";
  return parte
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function useUsuarioOrganizacao(): UsuarioOrganizacao {
  const [estado, setEstado] = useState<UsuarioOrganizacao>({
    nome: "",
    email: "",
    telefone: "",
    papel: null,
    permissoes: TODAS_PERMISSOES,
    organizacaoId: null,
    carregando: true,
  });

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let nome = "";
      let telefone = "";
      let papel: PapelOrganizacao | null = null;
      let organizacaoId: string | null = null;

      if (user) {
        const email = user.email ?? "";
        const [rUsuario, vinculos] = await Promise.all([
          supabase
            .from("usuarios")
            .select("nome, telefone")
            .eq("id", user.id)
            .maybeSingle(),
          listarVinculos(),
        ]);

        if (rUsuario.data) {
          if (typeof rUsuario.data.nome === "string" && rUsuario.data.nome.trim()) {
            nome = rUsuario.data.nome;
          }
          if (typeof rUsuario.data.telefone === "string") {
            telefone = rUsuario.data.telefone;
          }
        }

        // Vínculo efetivo determinístico (papel de maior privilégio). Com
        // múltiplos vínculos o maybeSingle falharia e papel/organização
        // ficariam null — quebrando a persistência silenciosamente.
        const vinculo = melhorVinculo(vinculos);
        papel = vinculo.papel;
        organizacaoId = vinculo.organizacaoId;

        if (!ativo) return;
        setEstado({
          nome: nome || nomeDoEmail(email),
          email,
          telefone,
          papel,
          permissoes: papel
            ? PERMISSOES_POR_PAPEL[papel] ?? TODAS_PERMISSOES
            : TODAS_PERMISSOES,
          organizacaoId,
          carregando: false,
        });
      } else {
        if (!ativo) return;
        setEstado((atual) => ({ ...atual, carregando: false }));
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  return estado;
}
