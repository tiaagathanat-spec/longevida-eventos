const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  
  // Verificar atleta do techiltonjr@gmail.com
  const atleta = await c.query(`select * from public.app_atletas where email = 'techiltonjr@gmail.com' or responsavel_nome = 'Hilton Marques Porto Junior'`);
  console.log("Atleta(s):");
  atleta.rows.forEach(a => console.log("  nome:", a.nome, "| email:", a.email, "| responsavel:", a.responsavel_nome));
  
  // Verificar perfil
  const perfil = await c.query(`select * from public.app_perfis where email = 'techiltonjr@gmail.com'`);
  console.log("\nPerfil:", perfil.rows[0]);
  
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
