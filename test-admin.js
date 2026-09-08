const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  
  // Simular admin user
  const adminUid = "81ec06ac-ee97-4c3c-8b68-85ecf795ab31";
  await c.query(`set role authenticated`);
  await c.query(`select set_config('request.jwt.claim.sub', $1, false)`, [adminUid]);
  await c.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: adminUid, email: "tiaagathanat@gmail.com", user_metadata: { nome: "Tia Agathanat" } })]);
  await c.query(`select set_config('request.jwt.claim.email', $1, false)`, ["tiaagathanat@gmail.com"]);
  
  // Testar app_papel_atual
  const papel = await c.query(`select public.app_papel_atual() as papel`);
  console.log("app_papel_atual:", papel.rows[0].papel);
  
  // Testar app_pode_esc_inscritos
  const pode = await c.query(`select public.app_pode_esc_inscritos() as pode`);
  console.log("app_pode_esc_inscritos:", pode.rows[0].pode);
  
  // Testar app_sou_dono_atleta_nome para atleta do evento
  const dono = await c.query(`select public.app_sou_dono_atleta_nome('Hilton Marques Porto Junior') as dono`);
  console.log("app_sou_dono_atleta_nome (Hilton):", dono.rows[0].dono);
  
  // Tentar INSERT em app_inscricoes
  try {
    await c.query(`
      insert into public.app_inscricoes (id, evento_id, prova_id, atleta_nome, status, data_inscricao, atleta_nome_2, atleta_nome_3, atleta_nome_4)
      values ('test-admin-1', 'bbo2gmwd', 'vpuoqrn5', 'Teste Admin', 'pendente', '2026-09-07', 'Parceiro 2', 'Parceiro 3', 'Parceiro 4')
    `);
    console.log("INSERT admin: OK");
    await c.query(`delete from public.app_inscricoes where id = 'test-admin-1'`);
  } catch (e) {
    console.log("INSERT admin ERRO:", e.message);
  }
  
  await c.query(`reset role`);
  await c.end();
})().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
