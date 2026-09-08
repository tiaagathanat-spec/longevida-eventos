const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  
  // Verificar conta atleta
  const atleta = await c.query(`select * from auth.users where email = 'techiltonjr@gmail.com'`);
  console.log("Auth user:", atleta.rows[0] ? "EXISTE" : "NÃO EXISTE");
  if (atleta.rows[0]) console.log("  ID:", atleta.rows[0].id);
  
  // Verificar perfil
  const perfil = await c.query(`select * from public.app_perfis where email = 'techiltonjr@gmail.com'`);
  console.log("Perfil:", perfil.rows[0] ? "EXISTE" : "NÃO EXISTE");
  if (perfil.rows[0]) console.log("  tipo_conta:", perfil.rows[0].tipo_conta);
  
  // Verificar atletas vinculados
  const atletas = await c.query(`select * from public.app_atletas where email = 'techiltonjr@gmail.com' or responsavel_nome = 'Hilton Marques'`);
  console.log("Atletas vinculados:", atletas.rows.length);
  atletas.rows.forEach(a => console.log("  -", a.nome, "| responsavel:", a.responsavel_nome));
  
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
