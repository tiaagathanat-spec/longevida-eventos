const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  
  // Verificar app_papel_atual
  const f = await c.query(`select prosrc from pg_proc where proname = 'app_papel_atual'`);
  console.log("app_papel_atual:\n", f.rows[0]?.prosrc);
  
  // Verificar app_sou_dono_atleta_nome
  const f2 = await c.query(`select prosrc from pg_proc where proname = 'app_sou_dono_atleta_nome'`);
  console.log("\napp_sou_dono_atleta_nome:\n", f2.rows[0]?.prosrc);
  
  // Verificar app_sou_dono_inscricao
  const f3 = await c.query(`select prosrc from pg_proc where proname = 'app_sou_dono_inscricao'`);
  console.log("\napp_sou_dono_inscricao:\n", f3.rows[0]?.prosrc);
  
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
