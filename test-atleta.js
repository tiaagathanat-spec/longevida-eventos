const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  
  // Simular atleta techiltonjr@gmail.com
  const atletaUid = "07599a77-828d-44c4-a434-2bbf7f8bbdf8";
  await c.query(`set role authenticated`);
  await c.query(`select set_config('request.jwt.claim.sub', $1, false)`, [atletaUid]);
  await c.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: atletaUid, email: "techiltonjr@gmail.com", user_metadata: { nome: "Hilton Marques Porto Junior" } })]);
  await c.query(`select set_config('request.jwt.claim.email', $1, false)`, ["techiltonjr@gmail.com"]);
  
  // Testar app_sou_dono_atleta_nome para o próprio atleta
  const dono = await c.query(`select public.app_sou_dono_atleta_nome('Hilton Marques Porto Junior') as dono`);
  console.log("app_sou_dono_atleta_nome (Hilton):", dono.rows[0].dono);
  
  // Testar INSERT como atleta
  try {
    await c.query(`
      insert into public.app_inscricoes (id, evento_id, prova_id, atleta_nome, status, data_inscricao, atleta_nome_2)
      values ('test-atleta-1', 'bbo2gmwd', 'vpuoqrn5', 'Hilton Marques Porto Junior', 'pendente', '2026-09-07', 'Parceiro 2')
    `);
    console.log("INSERT atleta: OK");
    await c.query(`delete from public.app_inscricoes where id = 'test-atleta-1'`);
  } catch (e) {
    console.log("INSERT atleta ERRO:", e.message);
  }
  
  await c.query(`reset role`);
  await c.end();
})().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
