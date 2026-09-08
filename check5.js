const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  
  // Verificar app_evento_autorizado
  const f1 = await c.query(`select prosrc from pg_proc where proname = 'app_evento_autorizado'`);
  console.log("app_evento_autorizado:\n", f1.rows[0]?.prosrc);
  
  // Verificar app_modulo_permitido_evento
  const f2 = await c.query(`select prosrc from pg_proc where proname = 'app_modulo_permitido_evento'`);
  console.log("\napp_modulo_permitido_evento:\n", f2.rows[0]?.prosrc);
  
  // Verificar app_pode_esc_inscritos
  const f3 = await c.query(`select prosrc from pg_proc where proname = 'app_pode_esc_inscritos'`);
  console.log("\napp_pode_esc_inscritos:\n", f3.rows[0]?.prosrc);
  
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
