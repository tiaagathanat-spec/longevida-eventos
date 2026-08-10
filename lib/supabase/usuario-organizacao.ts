"use client";

// Identidade do usuário autenticado dentro da área de Organização.
//
// Substitui o "funcionário ativo" do modo demonstração ("entrar como"):
// cada pessoa tem UMA conta, e o papel da equipe vem do vínculo
// organização <-> usuário (`organizacao_usuarios`), consultado no
// Supabase com base no usuário logado. As permissões de módulos seguem
// o papel retornado pelo banco (PERMISSOES_POR_PAPEL).

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
  carregando: boolean;
};

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

      if (user) {
        const email = user.email ?? "";
        const [rUsuario, rVinculo] = await Promise.all([
          supabase
            .from("usuarios")
            .select("nome, telefone")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("organizacao_usuarios")
            .select("papel")
            .eq("usuario_id", user.id)
            .maybeSingle(),
        ]);

        if (rUsuario.data) {
          if (typeof rUsuario.data.nome === "string" && rUsuario.data.nome.trim()) {
            nome = rUsuario.data.nome;
          }
          if (typeof rUsuario.data.telefone === "string") {
            telefone = rUsuario.data.telefone;
          }
        }

        const papelBruto = rVinculo.data?.papel;
        if (typeof papelBruto === "string" && papelBruto in PERMISSOES_POR_PAPEL) {
          papel = papelBruto as PapelOrganizacao;
        }

        if (!ativo) return;
        setEstado({
          nome: nome || nomeDoEmail(email),
          email,
          telefone,
          papel,
          permissoes: papel
            ? PERMISSOES_POR_PAPEL[papel] ?? TODAS_PERMISSOES
            : TODAS_PERMISSOES,
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
