const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  
  // Verificar app_usuario_atual_nome
  const f = await c.query(`select prosrc from pg_proc where proname = 'app_usuario_atual_nome'`);
  console.log("app_usuario_atual_nome:\n", f.rows[0]?.prosrc);
  
  // Verificar auth.jwt() structure
  const jwt = await c.query(`select prosrc from pg_proc where proname = 'auth.jwt'`);
  console.log("\nauth.jwt source:", jwt.rows[0]?.prosrc?.substring(0, 200));
  
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
