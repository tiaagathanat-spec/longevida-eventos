const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  
  // Verificar policies de app_inscricoes
  const policies = await c.query(`
    select polname, polcmd, polqual, polwithcheck 
    from pg_policy 
    where polrelid = 'public.app_inscricoes'::regclass
  `);
  console.log("Policies app_inscricoes:");
  policies.rows.forEach(p => console.log("  ", p.polname, "| cmd:", p.polcmd, "| qual:", p.polqual?.substring(0,80), "| check:", p.polwithcheck?.substring(0,80)));
  
  // Verificar grants
  const grants = await c.query(`
    select grantee, privilege_type 
    from information_schema.table_privileges 
    where table_name = 'app_inscricoes' and table_schema = 'public'
  `);
  console.log("\nGrants app_inscricoes:");
  grants.rows.forEach(g => console.log("  ", g.grantee, "|", g.privilege_type));
  
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
