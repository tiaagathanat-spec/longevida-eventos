// Limpeza pontual de dados: remove o vínculo órfão de CRONOMETRAGEM do
// admin (tiaagathanat@gmail.com) na organização de teste
// "Longevida - Teste de Cronometragem".
//
// CONTEXTO: o admin tem DOIS vínculos em organizacao_usuarios:
//   - 'cronometragem'   em "Longevida - Teste de Cronometragem"
//   - 'administrador'   em "Espaço Longevida"  <-- ESSENCIAL, nunca apagado
//
// O vínculo de teste quebra o RLS (app_papel_atual() usa LIMIT 1 sem
// ORDER BY e pode resolver para 'cronometragem'), bloqueando módulos de
// atletas/perfis/funcionários. Remover SÓ essa linha restaura o acesso.
//
// SEGURANÇA (revisada):
//   * Só roda no servidor (chave service_role via .env.local / env).
//   * DRY RUN por padrão: apenas imprime. Use --apply para executar.
//   * Alvo estrito por e-mail + nome da organização + papel — nunca um
//     uuid hardcoded, nunca um "apaga tudo".
//   * Aborta se o admin NÃO tiver vínculo 'administrador' na
//     "Espaço Longevida" (proteção contra apagar a identidade real).
//   * Idempotente: se a linha já não existir, não faz nada e reporta.
//
// Uso:
//   node scripts/limpar-vinculo-cronometragem-teste.mjs          (dry-run)
//   node scripts/limpar-vinculo-cronometragem-teste.mjs --apply  (executa)

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------- Alvos (config) ----------
const ADMIN_EMAIL = "tiaagathanat@gmail.com";
const ORG_TESTE_NOME = "Longevida - Teste de Cronometragem";
const ORG_SEGURA_NOME = "Espaço Longevida";
const PAPEL_ALVO = "cronometragem";
const PAPEL_INDISPENSAVEL = "administrador";

// ---------- Carrega env (.env.local no dev; process.env em produção) ----------
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

const aplicar = process.argv.includes("--apply");
const supabase = createClient(URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function buscarPorColuna(tabela, coluna, valor) {
  const { data, error } = await supabase.from(tabela).select("*").eq(coluna, valor);
  if (error) throw new Error(`erro ao consultar ${tabela} por ${coluna}: ${error.message}`);
  if (!data || data.length === 0) return null;
  if (data.length > 1) throw new Error(`mais de um ${coluna} '${valor}' em ${tabela}`);
  return data[0];
}

async function listarVinculos(usuarioId) {
  const { data, error } = await supabase
    .from("organizacao_usuarios")
    .select("organizacao_id, papel")
    .eq("usuario_id", usuarioId);
  if (error) throw new Error(`erro ao listar vínculos: ${error.message}`);
  return data ?? [];
}

async function main() {
  console.log(`[limpeza] modo: ${aplicar ? "--apply (EXECUTA)" : "dry-run (só inspeciona)"}\n`);

  const admin = await buscarPorColuna("usuarios", "email", ADMIN_EMAIL);
  if (!admin) throw new Error(`usuário '${ADMIN_EMAIL}' não existe em usuarios`);
  const adminId = admin.id;
  console.log(`admin: ${ADMIN_EMAIL} (${adminId})`);

  const orgTeste = await buscarPorColuna("organizacoes", "nome", ORG_TESTE_NOME);
  const orgSegura = await buscarPorColuna("organizacoes", "nome", ORG_SEGURA_NOME);

  if (!orgSegura) throw new Error(`organização '${ORG_SEGURA_NOME}' não existe`);
  if (!orgTeste) throw new Error(`organização de teste '${ORG_TESTE_NOME}' não existe`);

  // ---------- Verificação de segurança: o admin mantém o vínculo real ----------
  const vinculos = await listarVinculos(adminId);
  const vinculoSeguro = vinculos.find(
    (v) => v.organizacao_id === orgSegura.id && v.papel === PAPEL_INDISPENSAVEL
  );
  if (!vinculoSeguro) {
    throw new Error(
      `admin não tem vínculo '${PAPEL_INDISPENSAVEL}' em '${ORG_SEGURA_NOME}' — não vou mexer em nada.`
    );
  }

  const alvo = vinculos.find(
    (v) => v.organizacao_id === orgTeste.id && v.papel === PAPEL_ALVO
  );

  console.log("\nVínculos atuais do admin:");
  for (const v of vinculos) {
    const marca =
      v.organizacao_id === orgSegura.id && v.papel === PAPEL_INDISPENSAVEL
        ? " (indispensável — preservado)"
        : v.organizacao_id === orgTeste.id && v.papel === PAPEL_ALVO
          ? " (ALVO)"
          : "";
    console.log(`  - papel=${v.papel} org=${v.organizacao_id}${marca}`);
  }

  if (!alvo) {
    console.log(
      `\nNada a fazer: admin não possui vínculo '${PAPEL_ALVO}' em '${ORG_TESTE_NOME}'. Limpeza já aplicada.`
    );
    return;
  }

  if (!aplicar) {
    console.log(
      `\n[dry-run] Removeria EXATAMENTE: papel=${alvo.papel}, organizacao_id=${alvo.organizacao_id} (${ORG_TESTE_NOME}).\n`
    );
    console.log("Nada foi alterado. Confira acima e rode com --apply para executar.");
    return;
  }

  const { data, error } = await supabase
    .from("organizacao_usuarios")
    .delete()
    .eq("usuario_id", adminId)
    .eq("organizacao_id", alvo.organizacao_id)
    .eq("papel", PAPEL_ALVO)
    .select();

  if (error) throw new Error(`falha ao remover o vínculo: ${error.message}`);
  const removidos = data?.length ?? 0;

  const restantes = await listarVinculos(adminId);
  console.log(
    `\n${removidos} vínculo(s) removido(s). Vínculos restantes:`,
    restantes.map((v) => `${v.papel}@${v.organizacao_id}`).join(", ") || "(nenhum)"
  );

  if (removidos !== 1) {
    throw new Error(`esperava remover 1 vínculo, removidos ${removidos}. Revisar antes de repetir.`);
  }
  console.log("\nOK: vínculo de teste removido. O admin mantém o vínculo administrador.");
}

main()
  .then(() => {
    console.log("\n[limpeza] concluída.");
  })
  .catch((err) => {
    console.error(`\nABORTADO: ${err.message}`);
    process.exitCode = 1;
  });
