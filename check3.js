const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  
  // Verificar qual função é a 23997
  const func = await c.query(`
    select proname, prosrc from pg_proc where oid = 23997
  `);
  console.log("Função 23997:", func.rows[0]?.proname);
  console.log("Source:", func.rows[0]?.prosrc?.substring(0, 200));
  
  // Verificar função 23996
  const func2 = await c.query(`
    select proname, prosrc from pg_proc where oid = 23996
  `);
  console.log("\nFunção 23996:", func2.rows[0]?.proname);
  console.log("Source:", func2.rows[0]?.prosrc?.substring(0, 200));
  
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
