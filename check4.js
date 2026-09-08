const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  
  // Verificar função completa
  const func = await c.query(`
    select prosrc from pg_proc where proname = 'app_pode_escrever_modulo_evento'
  `);
  console.log("app_pode_escrever_modulo_evento:\n", func.rows[0]?.prosrc);
  
  // Verificar organizacao_usuarios
  const orgUsers = await c.query(`select * from public.organizacao_usuarios`);
  console.log("\norganizacao_usuarios:", orgUsers.rows);
  
  // Verificar admin user
  const adminUser = await c.query(`select id, email from auth.users where email like '%admin%' or email = 'tiaagathanat@gmail.com'`);
  console.log("\nAdmin users:", adminUser.rows);
  
  // Verificar evento bbo2gmwd
  const evento = await c.query(`select id, nome, organizacao_id from public.app_eventos where id = 'bbo2gmwd'`);
  console.log("\nEvento bbo2gmwd:", evento.rows[0]);
  
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
