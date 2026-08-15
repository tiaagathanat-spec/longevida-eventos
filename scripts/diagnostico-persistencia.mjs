// Diagnóstico SOMENTE-LEITURA da persistência das tabelas app_*.
//
// Objetivo: descobrir se os dados salvos pela tela estão de fato no
// banco (se sim, o problema está no carregamento/refresh; se não, o
// problema está na gravação).
//
// SEGURANÇA:
//   * Só lê via service_role (chave de .env.local / env), nunca escreve.
//   * Não imprime PII (cpf, e-mail, telefone, endereço, data nascimento,
//     responsável) — apenas ids, contagens e campos neutros.
//
// Uso:
//   node scripts/diagnostico-persistencia.mjs
//
// Exemplo de saída esperada para cada tabela:
//   [app_eventos] 3 linha(s)
//      id=bbo2gmwd nome="2° Aquatlhon..." organizacao_id=da4938f9-... criado em 2026-..-..
//      ...

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

if (existsSync(resolve(".env.local"))) {
  try {
    process.loadEnvFile(".env.local");
  } catch (err) {
    console.error("Aviso: não foi possível carregar .env.local:", err.message);
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_ROLE) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local / environment."
  );
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// (tabela, colunasSeguras) — colunas neutras para impressão.
const TABELAS = [
  ["app_eventos", ["id", "nome", "data", "local", "status", "vagas", "organizacao_id"]],
  ["app_provas", ["id", "evento_id", "modalidade_id", "categoria_id", "horario", "valor"]],
  ["app_inscricoes", ["id", "evento_id", "prova_id", "atleta_nome", "status", "data_inscricao"]],
  ["app_atletas", ["id", "nome"]],
  ["app_perfis", ["id", "nome"]],
  ["app_pagamentos", ["inscricao_id", "valor", "forma_pagamento", "status", "data_pagamento"]],
  ["app_resultados", ["id", "inscricao_id", "tempo", "revisao"]],
  ["app_dorsais", ["id", "inscricao_id", "numero", "check_in_feito", "kit_entregue"]],
  ["app_qrcodes", ["id", "inscricao_id", "ativo", "criado_em"]],
  ["app_faixas_numeracao", ["id", "evento_id", "grupo_tipo", "grupo_id", "cor"]],
  ["app_galeria", ["id", "evento_id", "nome", "visibilidade"]],
  ["app_regulamentos", ["id", "evento_id", "tipo", "nome"]],
  ["app_funcionarios", ["id", "nome", "papel", "usuario_id", "ativo"]],
  ["app_publicacoes", ["prova_id", "publicado_em"]],
  ["app_patrocinadores", ["id", "nome", "cota"]],
];

async function main() {
  console.log("[diagnóstico] SOMENTE-LEITURA — nada será alterado.\n");

  const { data: usuarios, error: errUsuarios } = await supabase
    .from("usuarios")
    .select("id, email, nome");
  if (errUsuarios) throw new Error(`erro ao consultar usuarios: ${errUsuarios.message}`);
  console.log(`[usuarios] ${usuarios.length} usuário(s)`);
  for (const u of usuarios) {
    console.log(`   id=${u.id} email=${u.email} nome="${u.nome ?? ""}"`);
  }

  const { data: orgs, error: errOrgs } = await supabase
    .from("organizacoes")
    .select("id, nome");
  if (errOrgs) throw new Error(`erro ao consultar organizacoes: ${errOrgs.message}`);
  console.log(`\n[organizacoes] ${orgs.length} organização(ões)`);
  for (const o of orgs) {
    console.log(`   id=${o.id} nome="${o.nome}"`);
  }

  for (const email of usuarios.map((u) => u.email)) {
    const { data: vinculos, error: errVin } = await supabase
      .from("organizacao_usuarios")
      .select("organizacao_id, papel")
      .eq("usuario_id", usuarios.find((u) => u.email === email).id);
    if (errVin) throw new Error(`erro ao listar vínculos de ${email}: ${errVin.message}`);
    console.log(`\n[vínculos de ${email}] ${vinculos.length}`);
    for (const v of vinculos) {
      const org = orgs.find((o) => o.id === v.organizacao_id);
      console.log(`   papel=${v.papel} org=${v.organizacao_id}${org ? ` (${org.nome})` : ""}`);
    }
  }

  console.log("");
  for (const [tabela, colunas] of TABELAS) {
    const { data, error } = await supabase.from(tabela).select(colunas.join(","));
    if (error) {
      console.log(`[${tabela}] ERRO ao consultar: ${error.message}`);
      continue;
    }
    const linhas = data ?? [];
    console.log(`[${tabela}] ${linhas.length} linha(s)`);
    for (const l of linhas) {
      const partes = colunas.map((c) => `${c}=${JSON.stringify(l[c] ?? null)}`);
      console.log(`   ${partes.join(" ")}`);
    }
  }
}

main()
  .then(() => {
    console.log("\n[diagnóstico] concluído.");
  })
  .catch((err) => {
    console.error(`\nABORTADO: ${err.message}`);
    process.exitCode = 1;
  });
