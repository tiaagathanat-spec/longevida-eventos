const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const tabelas = [
    "app_inscricoes","app_atletas","app_eventos","app_provas","app_tipos_prova",
    "app_categorias","app_modalidades","app_pagamentos","app_dorsais","app_resultados",
    "app_galeria","app_faixas_numeracao","app_patrocinadores","app_funcionarios",
    "app_perfis","app_qrcodes","app_publicacoes","app_regulamentos"
  ];
  for (const t of tabelas) {
    try {
      await c.query(`GRANT SELECT ON public.${t} TO anon;`);
      console.log(`GRANT SELECT ON ${t} TO anon -> OK`);
    } catch(e) { console.log(`GRANT ${t}: ${e.message}`); }
  }
  await c.end();
  console.log("Fim");
})().catch(e => { console.error(e.message); process.exit(1); });
