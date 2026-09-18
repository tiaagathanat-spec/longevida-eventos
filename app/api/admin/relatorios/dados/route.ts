// Fonte de dados do módulo Relatórios Operacionais.
//
// Lê TODOS os registros persistidos das tabelas app_* com a chave
// service_role no servidor (bypass de RLS): as telas usam anon + RLS e
// podem não enxergar todas as linhas gravadas, então aqui o relatório
// visa SEMPRE os dados reais e completos.
//
// Escopo: os dados retornados ficam restritos aos eventos da própria
// organização do administrador autenticado (idempotente com o RLS por
// organizacao/evento da migration 0010) — nenhum dado de outra org vaza,
// mesmo usando service_role.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuarioAtual, getOrganizacoesDoUsuario } from "@/lib/auth";

function snakeParaCamel(linha: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(linha)) {
    const camel = chave.replace(/_([a-z0-9])/g, (_, letra: string) =>
      letra.toUpperCase()
    );
    saida[camel] = valor;
  }
  return saida;
}

export async function GET() {
  const usuario = await getUsuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const organizacoes = await getOrganizacoesDoUsuario(usuario.id);
  const orgAdmin = organizacoes.find((o) => o.papel === "administrador");
  if (!orgAdmin) {
    return NextResponse.json(
      { erro: "Você precisa ser administrador para acessar os relatórios." },
      { status: 403 }
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Configuração de segurança ausente." },
      { status: 500 }
    );
  }

  const tabelas = [
    "app_eventos",
    "app_provas",
    "app_categorias",
    "app_modalidades",
    "app_tipos_prova",
    "app_inscricoes",
    "app_atletas",
    "app_dorsais",
    "app_pagamentos",
    "app_prova_etapas",
  ] as const;

  const resultados = await Promise.all(
    tabelas.map(async (tabela) => {
      const { data, error } = await admin.from(tabela).select("*");
      if (error) {
        throw Object.assign(new Error(error.message), { tabela });
      }
      return [tabela, data ?? []] as const;
    })
  );

  const mapa = new Map<string, unknown[]>(resultados);
  const ler = (tabela: string) => mapa.get(tabela) ?? [];
  const camel = (itens: unknown[]) => itens.map((i) => snakeParaCamel(i as Record<string, unknown>));

  const eventosTodos = camel(ler("app_eventos")) as {
    id: string;
    organizacaoId?: string | null;
  }[];
  // Admin enxerga os eventos da própria organização (e os legados sem org).
  const eventosDaOrg = eventosTodos.filter(
    (e) => !e.organizacaoId || e.organizacaoId === orgAdmin.organizacaoId
  );
  const idsEventos = new Set(eventosDaOrg.map((e) => e.id));

  const provas = camel(ler("app_provas")).filter(
    (p) => idsEventos.has(p.eventoId as string)
  );
  const idsProvas = new Set(provas.map((p) => p.id));

  const inscricoes = camel(ler("app_inscricoes")).filter(
    (i) => idsEventos.has(i.eventoId as string)
  );
  const idsInscricoes = new Set(inscricoes.map((i) => i.id));

  const dorsais = camel(ler("app_dorsais")).filter((d) =>
    idsInscricoes.has(d.inscricaoId as string)
  );
  const pagamentos = camel(ler("app_pagamentos")).filter((p) =>
    idsInscricoes.has(p.inscricaoId as string)
  );
  const etapas = camel(ler("app_prova_etapas")).filter((e) =>
    idsProvas.has(e.provaId as string)
  );

  return NextResponse.json({
    eventos: eventosDaOrg,
    provas,
    categorias: camel(ler("app_categorias")),
    modalidades: camel(ler("app_modalidades")),
    tiposProva: camel(ler("app_tipos_prova")),
    inscricoes,
    atletas: camel(ler("app_atletas")),
    dorsais,
    pagamentos,
    etapas,
  });
}