const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r1 = await c.query(`select column_name from information_schema.columns where table_name = 'app_inscricoes' and column_name like 'atleta_nome%' order by column_name`);
  console.log("app_inscricoes colunas:", r1.rows.map(x=>x.column_name).join(", "));
  const r2 = await c.query(`select column_name from information_schema.columns where table_name = 'app_tipos_prova' and column_name = 'integrantes'`);
  console.log("app_tipos_prova.integrantes:", r2.rows.length > 0 ? "EXISTE" : "NÃO EXISTE");
  const r3 = await c.query(`select nome, integrantes from public.app_tipos_prova order by id`);
  console.log("Tipos de prova:", JSON.stringify(r3.rows));
  await c.end();
})().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
