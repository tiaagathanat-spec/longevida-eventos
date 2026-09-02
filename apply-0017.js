const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(`
    alter table public.app_inscricoes
      add column if not exists atleta_nome_3 text,
      add column if not exists atleta_nome_4 text;

    alter table public.app_tipos_prova
      add column if not exists integrantes int not null default 1;

    update public.app_tipos_prova
      set integrantes = 4
      where lower(nome) like \'%quarteto%\' or lower(nome) like \'%quarto%\';

    update public.app_tipos_prova
      set integrantes = 2
      where lower(nome) like \'%dupla%\' or lower(nome) like \'%duplo%\';

    update public.app_tipos_prova
      set integrantes = 2
      where integrantes = 1 and permite_equipe = true;
  `);
  console.log("Migration 0017 aplicada com sucesso");
  await c.end();
})().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
