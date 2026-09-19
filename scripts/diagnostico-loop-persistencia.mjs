// Diagnóstico SOMENTE-LEITURA do loop de persistência (dorsais/inscrições).
//
// Objetivo: quantificar os dados que alimentam o consumo excessivo do
// Supabase —
//   1. Duplicatas em app_dorsais (1+ dorsal para a mesma inscrição/prova);
//   2. Duplicatas em app_inscricoes (mesmo atleta + prova repetido);
//   3. Dorsais órfãos (sem inscrição/prova correspondente);
//   4. Espelho numero_peito divergente do dorsal oficial;
//   5. Status das constraints UNIQUE (0018 prova+numero e 0025 prova+inscricao).
//
// SEGURANÇA:
//   * Só lê via service_role (chave de .env.local / env), nunca escreve.
//   * Não imprime PII — apenas ids, contagens e campos neutros.
//
// Uso:
//   node scripts/diagnostico-loop-persistencia.mjs

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

async function main() {
  console.log("[diagnóstico-loop] SOMENTE-LEITURA — nada será alterado.\n");

  // --- 1) Constraints UNIQUE presentes em app_dorsais --------------------
  console.log("== Constraints únicas em app_dorsais ==");
  const { data: constraints, error: errConstraints } = await supabase
    .from("information_schema")
    .select("constraint_name")
    .eq("table_schema", "public")
    .eq("table_name", "app_dorsais")
    .eq("constraint_type", "UNIQUE");
  if (errConstraints) {
    console.log(`   ERRO ao consultar information_schema: ${errConstraints.message}`);
  } else {
    const nomes = (constraints ?? []).map((c) => c.constraint_name);
    for (const nome of [
      "app_dorsais_prova_numero_unique",
      "app_dorsais_prova_inscricao_uniq",
    ]) {
      const presente = nomes.includes(nome);
      console.log(`   ${nome}: ${presente ? "PRESENTE" : "AUSENTE"}`);
    }
    const outras = nomes.filter(
      (n) =>
        n !== "app_dorsais_prova_numero_unique" &&
        n !== "app_dorsais_prova_inscricao_uniq"
    );
    if (outras.length > 0) console.log(`   (outras: ${outras.join(", ")})`);
  }

  // --- 2) Totais ---------------------------------------------------------
  console.log("\n== Totais ==");
  for (const tabela of ["app_dorsais", "app_inscricoes", "app_provas", "app_eventos"]) {
    const { count, error } = await supabase
      .from(tabela)
      .select("id", { count: "exact", head: true });
    console.log(`   ${tabela}: ${error ? `ERRO (${error.message})` : `${count}`}`);
  }
  const { count: dorsaisConfirmadas, error: errDorsais } = await supabase
    .from("app_dorsais")
    .select("id", { count: "exact", head: true })
    .eq("check_in_feito", true);
  if (errDorsais) {
    console.log(`   app_dorsais check_in: ERRO (${errDorsais.message})`);
  } else {
    console.log(`   app_dorsais com check_in_feito=true: ${dorsaisConfirmadas}`);
  }

  // --- 3) Duplicatas em app_dorsais: 1+ dorsal por (prova, inscricao) ---
  console.log("\n== Duplicatas em app_dorsais (agrupando por prova+inscricao) ==");
  const { data: dups, error: errDups } = await supabase
    .from("app_dorsais")
    .select("prova_id, inscricao_id, numero, atribuido_em, check_in_feito, kit_entregue");
  if (errDups) {
    console.log(`   ERRO ao consultar: ${errDups.message}`);
  } else {
    const grupos = new Map();
    for (const d of dups ?? []) {
      const chave = `${d.prova_id}::${d.inscricao_id}`;
      const g = grupos.get(chave) ?? [];
      g.push(d);
      grupos.set(chave, g);
    }
    let linhasDuplicadas = 0;
    for (const [chave, g] of grupos) {
      if (g.length > 1) {
        linhasDuplicadas += g.length - 1;
        console.log(
          `   prova=${g[0].prova_id} inscricao=${g[0].inscricao_id}: ${g.length} dorsais → numeros=${g
            .map((d) => d.numero)
            .join(",")}`
        );
      }
    }
    if (grupos.size === 0) {
      console.log("   (sem dados)");
    } else {
      console.log(
        `   RESUMO: ${grupos.size} combinação(ões) prova+inscricao, ` +
          `${linhasDuplicadas} linha(s) redundante(s) (a manter seria 1 por grupo).`
      );
    }
  }

  // --- 4) Número repetido na mesma prova (deveria estar travado se 0018 aplicada) ---
  console.log("\n== Numeros repetidos na mesma prova em app_dorsais ==");
  const { data: nums, error: errNums } = await supabase
    .from("app_dorsais")
    .select("id, prova_id, numero, inscricao_id");
  if (errNums) {
    console.log(`   ERRO ao consultar: ${errNums.message}`);
  } else {
    const porProva = new Map();
    for (const d of nums ?? []) {
      const g = porProva.get(d.prova_id) ?? [];
      g.push(d);
      porProva.set(d.prova_id, g);
    }
    let colisoes = 0;
    for (const [prova, lista] of porProva) {
      const numeros = new Map();
      for (const d of lista) {
        const arr = numeros.get(String(d.numero)) ?? [];
        arr.push(d.id);
        numeros.set(String(d.numero), arr);
      }
      for (const [numero, ids] of numeros) {
        if (ids.length > 1) {
          colisoes += ids.length - 1;
          console.log(`   prova=${prova} numero=${numero}: ids=${ids.join(",")}`);
        }
      }
    }
    if (colisoes === 0) {
      console.log("   nenhuma colisão de número por prova.");
    } else {
      console.log(`   RESUMO: ${colisoes} dorsal(is) colidente(s).`);
    }
  }

  // --- 5) Dorsais órfãos (sem inscrição) ---------------------------------
  console.log("\n== Dorsais órfãos ==");
  const { data: orfaos, error: errOrfaos } = await supabase
    .from("app_dorsais")
    .select("id, prova_id, inscricao_id, numero");
  if (errOrfaos) {
    console.log(`   ERRO ao consultar: ${errOrfaos.message}`);
  } else {
    const idsInscricoes = new Set();
    const { data: inscricoesIds, error: errIds } = await supabase
      .from("app_inscricoes")
      .select("id");
    if (errIds) throw new Error(`erro ao listar inscricoes: ${errIds.message}`);
    for (const i of inscricoesIds) idsInscricoes.add(i.id);
    const semInscricao = (orfaos ?? []).filter((d) => !idsInscricoes.has(d.inscricao_id));
    const semProva = (orfaos ?? []).filter((d) => !d.prova_id);
    console.log(`   dorsais sem inscrição correspondente: ${semInscricao.length}`);
    for (const d of semInscricao.slice(0, 20)) {
      console.log(`      id=${d.id} inscricao_id=${d.inscricao_id} numero=${d.numero}`);
    }
    console.log(`   dorsais com prova_id nulo/vazio: ${semProva.length}`);
    for (const d of semProva.slice(0, 20)) {
      console.log(`      id=${d.id} inscricao_id=${d.inscricao_id} numero=${d.numero}`);
    }
  }

  // --- 6) Espelho numero_peito divergente do dorsal oficial -----------------
  console.log("\n== Inscricoes confirmadas sem dorsal correspondente ==");
  const { data: inscricoes, error: errInsc } = await supabase
    .from("app_inscricoes")
    .select("id, status, numero_peito, prova_id");
  const { data: dorsais, error: errDors } = await supabase
    .from("app_dorsais")
    .select("inscricao_id, numero, prova_id");
  if (errInsc || errDors) {
    console.log(
      `   ERRO (inscricoes: ${errInsc?.message ?? "-"}, dorsais: ${errDors?.message ?? "-"})`
    );
  } else {
    const dorsalPorInscricao = new Map();
    for (const d of dorsais) dorsalPorInscricao.set(d.inscricao_id, d);
    let semDorsal = 0;
    let espelhoErrado = 0;
    for (const i of inscricoes ?? []) {
      if (i.status !== "confirmada") continue;
      const dorsal = dorsalPorInscricao.get(i.id);
      if (!dorsal) {
        semDorsal++;
        continue;
      }
      if (String(i.numero_peito ?? "") !== String(dorsal.numero)) espelhoErrado++;
    }
    console.log(`   confirmadas sem dorsal: ${semDorsal}`);
    console.log(`   confirmadas com numero_peito divergente do dorsal: ${espelhoErrado}`);
  }

  // --- 7) Inscricoes duplicadas (mesmo atleta + prova + evento) -------------
  console.log("\n== Inscricoes duplicadas (agrupando por evento+prova+atleta) ==");
  const { data: inscAll, error: errInscAll } = await supabase
    .from("app_inscricoes")
    .select("id, evento_id, prova_id, atleta_nome, status, data_inscricao");
  if (errInscAll) {
    console.log(`   ERRO ao consultar: ${errInscAll.message}`);
  } else {
    const grupos = new Map();
    for (const i of inscAll ?? []) {
      const chave = `${i.evento_id}::${i.prova_id}::${i.atleta_nome}`;
      const g = grupos.get(chave) ?? [];
      g.push(i);
      grupos.set(chave, g);
    }
    let duplicadas = 0;
    for (const [chave, g] of grupos) {
      if (g.length > 1) {
        const [evento, prova, atleta] = chave.split("::");
        duplicadas += g.length - 1;
        console.log(
          `   evento=${evento} prova=${prova} atleta="${atleta}": ${g.length} inscricoes → ids=${g
            .map((i) => `${i.id}(${i.status})`)
            .join(", ")}`
        );
      }
    }
    if (grupos.size === 0) {
      console.log("   (sem dados)");
    } else {
      console.log(
        `   RESUMO: ${duplicadas} inscricao(oes) além da primeira por atleta+prova+evento.`
      );
    }
  }

  console.log("\n[diagnóstico-loop] concluído.");
}

main().catch((err) => {
  console.error(`\nABORTADO: ${err.message}`);
  process.exitCode = 1;
});