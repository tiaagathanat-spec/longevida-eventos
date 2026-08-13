-- ============================================================
-- Longevida Eventos — 90_reparo_0010.sql
-- REPARO IDEMPOTENTE da migration 0010_escopo_organizacao_evento.sql
--
-- CONTEXTO:
--   A 0010 foi executada em produção e falhou com
--     ERROR: 42710: policy "app_eventos_write_escopo" for table
--     "app_eventos" already exists
--   porque as policies *escopo* da seção 7 são criadas sem
--   `drop policy if exists` do PRÓPRIO nome. A segunda execução
--   (re-run) abortou no create de app_eventos_write_escopo e, por
--   isso, 7.2 a 7.11 podem não ter sido aplicadas.
--
-- ESTADO CONFIRMADO (auditoria somente-leitura, Sessão 3):
--   * 1. organizacao_id (coluna)         = EXISTE
--   * 2. app_funcionario_eventos (tabela)= EXISTE (+ 2 policies da 7.0)
--   * 3. usuario_id (coluna)             = EXISTE
--   * 4. 13 helpers da seção 4           = EXISTEM (RPC via anon 200)
--   * 5. grants das 13 funções           = APLICADOS
--   * 6. índices da seção 6              = presumidos OK (idempotentes)
--   * 7.0 junction policies (2)          = EXISTEM
--   * 7.1 app_eventos_write_escopo       = EXISTE
--   * 7.2 a 7.11 policies *escopo*       = AUSENTES (faltam aplicar)
--
-- O QUE ESTE SCRIPT FAZ:
--   * Recria TODOS os objetos da 0010 de forma IDEMPOTENTE (seguro
--     rodar mais de uma vez), convergindo para o estado-final da 0010.
--   * A diferença em relação à 0010 original é APENAS na seção 7:
--     cada `create policy` é precedido de `drop policy if exists`
--     TANTO do nome antigo (0009) QUANTO do nome novo (*escopo*).
--
-- SEGURANÇA:
--   * Não apaga dados, não dropa tabela/coluna, não altera ids.
--   * Backfills são guardados por condições de estado (nunca sobrescrevem).
--   * Pode ser re-executado sem efeito colateral (erro zero esperado).
--
-- COMO USAR:
--   1. (Opcional) Rodar 02_validacao_pos_0010.sql ANTES para confirmar
--      o estado parcial.
--   2. Executar ESTE arquivo inteiro no Supabase SQL Editor.
--   3. Rodar 02_validacao_pos_0010.sql DEPOIS, com as expectativas
--      ajustadas (ver cabeçalho daquele arquivo: eventos_sem_org = 1
--      e app_galeria_select_publica substituída por select_escopo).
-- ============================================================


-- ============================================================
-- 1. APP_EVENTOS.ORGANIZACAO_ID + BACKFILL + FK
-- ============================================================

alter table public.app_eventos
  add column if not exists organizacao_id uuid;

-- Backfill CONSERVADOR: somente eventos com origem CONFIRMADA recebem
-- organização (idêntico à 0010; a condição "e.organizacao_id is null"
-- torna a repetição inofensiva).
update public.app_eventos e
set organizacao_id = o.id
from public.organizacoes o
where o.id = 'da4938f9-7b9d-41b5-b508-57fa17a5a7cd'
  and o.nome = 'Espaço Longevida'
  and e.id = 'bbo2gmwd'
  and e.organizacao_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_eventos_organizacao_id_fkey'
  ) then
    alter table public.app_eventos
      add constraint app_eventos_organizacao_id_fkey
      foreign key (organizacao_id) references public.organizacoes (id)
      on delete set null;
  end if;
end $$;

create index if not exists ix_app_eventos_organizacao_id
  on public.app_eventos (organizacao_id);


-- ============================================================
-- 2. APP_FUNCIONARIO_EVENTOS (vínculo funcionário(auth) <-> evento)
-- ============================================================

create table if not exists public.app_funcionario_eventos (
  id uuid not null default gen_random_uuid(),
  usuario_id uuid not null,
  evento_id text not null,
  permissoes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_funcionario_eventos_pkey') then
    alter table public.app_funcionario_eventos
      add constraint app_funcionario_eventos_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_funcionario_eventos_usuario_evento_key') then
    alter table public.app_funcionario_eventos
      add constraint app_funcionario_eventos_usuario_evento_key
      unique (usuario_id, evento_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_funcionario_eventos_usuario_id_fkey') then
    alter table public.app_funcionario_eventos
      add constraint app_funcionario_eventos_usuario_id_fkey
      foreign key (usuario_id) references public.usuarios (id)
      on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_funcionario_eventos_evento_id_fkey') then
    alter table public.app_funcionario_eventos
      add constraint app_funcionario_eventos_evento_id_fkey
      foreign key (evento_id) references public.app_eventos (id)
      on delete cascade;
  end if;
end $$;

create index if not exists ix_app_funcionario_eventos_evento_id
  on public.app_funcionario_eventos (evento_id);

create or replace function public.app_atualizar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_app_funcionario_eventos_updated_at'
  ) then
    create trigger trg_app_funcionario_eventos_updated_at
      before update on public.app_funcionario_eventos
      for each row execute function public.app_atualizar_updated_at();
  end if;
end $$;

alter table public.app_funcionario_eventos enable row level security;

grant select, insert, update, delete
  on public.app_funcionario_eventos
  to authenticated;


-- ============================================================
-- 3. APP_FUNCIONARIOS.USUARIO_ID (registro admin -> identidade auth)
-- ============================================================

alter table public.app_funcionarios
  add column if not exists usuario_id uuid;

-- Backfill por e-mail, somente com correspondência inequívoca.
update public.app_funcionarios f
set usuario_id = u.id
from public.usuarios u
where f.usuario_id is null
  and f.email = u.email
  and (select count(*) from public.usuarios where email = u.email) = 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_funcionarios_usuario_id_fkey') then
    alter table public.app_funcionarios
      add constraint app_funcionarios_usuario_id_fkey
      foreign key (usuario_id) references public.usuarios (id)
      on delete set null;
  end if;
end $$;

create index if not exists ix_app_funcionarios_usuario_id
  on public.app_funcionarios (usuario_id);


-- ============================================================
-- 4. HELPERS (SECURITY DEFINER somente onde há acesso a tabelas)
-- ============================================================

create or replace function public.app_papel_na_org(p_organizacao_id uuid)
returns public.papel_organizacao language sql stable security definer
set search_path = '' as $$
  select ou.papel
  from public.organizacao_usuarios ou
  where ou.usuario_id = auth.uid()
    and ou.organizacao_id = p_organizacao_id
  limit 1;
$$;

create or replace function public.app_permissoes_do_papel(
  p_papel public.papel_organizacao
) returns text[] language sql stable as $$
  select case p_papel
    when 'administrador' then array['eventos','provas','inscritos','kits','resultados','classificacao','cronometragem','financeiro','configuracoes']
    when 'organizador'   then array['eventos','provas','inscritos','kits','resultados','classificacao']
    when 'cronometragem' then array['eventos','provas','resultados','classificacao','cronometragem']
    when 'financeiro'    then array['eventos','inscritos','financeiro']
    when 'leitura'       then array['eventos','provas','inscritos','classificacao']
    else array[]::text[]
  end;
$$;

create or replace function public.app_org_do_evento(p_evento_id text)
returns uuid language sql stable security definer
set search_path = '' as $$
  select organizacao_id from public.app_eventos where id = p_evento_id;
$$;

create or replace function public.app_evento_da_inscricao(p_inscricao_id text)
returns text language sql stable security definer
set search_path = '' as $$
  select evento_id from public.app_inscricoes where id = p_inscricao_id;
$$;

create or replace function public.app_evento_da_prova(p_prova_id text)
returns text language sql stable security definer
set search_path = '' as $$
  select evento_id from public.app_provas where id = p_prova_id;
$$;

create or replace function public.app_evento_autorizado(p_evento_id text)
returns boolean language sql stable security definer
set search_path = '' as $$
  select coalesce(
    exists (
      select 1
      from public.app_eventos e
      join public.organizacao_usuarios ou
        on ou.organizacao_id = e.organizacao_id
        and ou.usuario_id = auth.uid()
      where e.id = p_evento_id
        and (
          ou.papel = 'administrador'
          or not exists (
            select 1
            from public.app_funcionario_eventos fe
            join public.app_eventos e2 on e2.id = fe.evento_id
            where fe.usuario_id = auth.uid()
              and e2.organizacao_id = e.organizacao_id
          )
          or exists (
            select 1
            from public.app_funcionario_eventos fe
            where fe.usuario_id = auth.uid()
              and fe.evento_id = e.id
          )
        )
    ),
    false
  );
$$;

create or replace function public.app_eventos_autorizados()
returns setof text language sql stable security definer
set search_path = '' as $$
  select e.id
  from public.app_eventos e
  join public.organizacao_usuarios ou
    on ou.organizacao_id = e.organizacao_id
    and ou.usuario_id = auth.uid()
  where ou.papel = 'administrador'
     or not exists (
        select 1
        from public.app_funcionario_eventos fe
        join public.app_eventos e2 on e2.id = fe.evento_id
        where fe.usuario_id = auth.uid()
          and e2.organizacao_id = e.organizacao_id
     )
     or exists (
        select 1
        from public.app_funcionario_eventos fe
        where fe.usuario_id = auth.uid()
          and fe.evento_id = e.id
     );
$$;

create or replace function public.app_pode_evento(p_evento_id text)
returns boolean language sql stable security definer
set search_path = '' as $$
  select p_evento_id = any (select public.app_eventos_autorizados());
$$;

create or replace function public.app_modulo_permitido_evento(
  p_papel public.papel_organizacao,
  p_evento_id text,
  p_modulo text
) returns boolean language sql stable security definer
set search_path = '' as $$
  select
    exists (
      select 1
      from public.app_funcionario_eventos fe
      where fe.usuario_id = auth.uid()
        and fe.evento_id = p_evento_id
        and jsonb_array_length(coalesce(fe.permissoes, '[]'::jsonb)) > 0
        and p_modulo = any (select jsonb_array_elements_text(fe.permissoes))
    )
    or (
      not exists (
        select 1
        from public.app_funcionario_eventos fe
        where fe.usuario_id = auth.uid()
          and fe.evento_id = p_evento_id
          and jsonb_array_length(coalesce(fe.permissoes, '[]'::jsonb)) > 0
      )
      and p_modulo = any (public.app_permissoes_do_papel(p_papel))
    );
$$;

create or replace function public.app_pode_modulo_evento(
  p_evento_id text,
  p_modulo text
) returns boolean language sql stable security definer
set search_path = '' as $$
  select coalesce(
    exists (
      select 1
      from public.app_eventos e
      join public.organizacao_usuarios ou
        on ou.organizacao_id = e.organizacao_id
        and ou.usuario_id = auth.uid()
      where e.id = p_evento_id
        and (
          ou.papel = 'administrador'
          or (
            public.app_evento_autorizado(e.id)
            and public.app_modulo_permitido_evento(ou.papel, e.id, p_modulo)
          )
        )
    ),
    false
  );
$$;

create or replace function public.app_pode_escrever_modulo_evento(
  p_evento_id text,
  p_modulo text
) returns boolean language sql stable security definer
set search_path = '' as $$
  select coalesce(
    exists (
      select 1
      from public.app_eventos e
      join public.organizacao_usuarios ou
        on ou.organizacao_id = e.organizacao_id
        and ou.usuario_id = auth.uid()
      where e.id = p_evento_id
        and ou.papel <> 'leitura'
        and (
          ou.papel = 'administrador'
          or (
            public.app_evento_autorizado(e.id)
            and public.app_modulo_permitido_evento(ou.papel, e.id, p_modulo)
          )
        )
    ),
    false
  );
$$;

create or replace function public.app_pode_escrever_modulo_org(
  p_organizacao_id uuid,
  p_modulo text
) returns boolean language sql stable security definer
set search_path = '' as $$
  select coalesce(
    exists (
      select 1
      from public.organizacao_usuarios ou
      where ou.usuario_id = auth.uid()
        and ou.organizacao_id = p_organizacao_id
        and ou.papel <> 'leitura'
        and (
          ou.papel = 'administrador'
          or p_modulo = any (public.app_permissoes_do_papel(ou.papel))
        )
    ),
    false
  );
$$;

create or replace function public.app_pode_ler_inscricoes_cronometragem(p_evento_id text)
returns boolean language sql stable security definer
set search_path = '' as $$
  select coalesce(
    exists (
      select 1
      from public.app_eventos e
      join public.organizacao_usuarios ou
        on ou.organizacao_id = e.organizacao_id
        and ou.usuario_id = auth.uid()
      where e.id = p_evento_id
        and ou.papel = 'cronometragem'
        and public.app_evento_autorizado(e.id)
    ),
    false
  );
$$;


-- ============================================================
-- 5. GRANTS DAS NOVAS FUNÇÕES
-- ============================================================

revoke all on function public.app_papel_na_org(uuid) from public;
revoke all on function public.app_permissoes_do_papel(public.papel_organizacao) from public;
revoke all on function public.app_org_do_evento(text) from public;
revoke all on function public.app_evento_da_inscricao(text) from public;
revoke all on function public.app_evento_da_prova(text) from public;
revoke all on function public.app_evento_autorizado(text) from public;
revoke all on function public.app_eventos_autorizados() from public;
revoke all on function public.app_pode_evento(text) from public;
revoke all on function public.app_modulo_permitido_evento(public.papel_organizacao, text, text) from public;
revoke all on function public.app_pode_modulo_evento(text, text) from public;
revoke all on function public.app_pode_escrever_modulo_evento(text, text) from public;
revoke all on function public.app_pode_escrever_modulo_org(uuid, text) from public;
revoke all on function public.app_pode_ler_inscricoes_cronometragem(text) from public;

grant execute on function public.app_papel_na_org(uuid) to anon, authenticated;
grant execute on function public.app_permissoes_do_papel(public.papel_organizacao) to anon, authenticated;
grant execute on function public.app_org_do_evento(text) to anon, authenticated;
grant execute on function public.app_evento_da_inscricao(text) to anon, authenticated;
grant execute on function public.app_evento_da_prova(text) to anon, authenticated;
grant execute on function public.app_evento_autorizado(text) to anon, authenticated;
grant execute on function public.app_eventos_autorizados() to anon, authenticated;
grant execute on function public.app_pode_evento(text) to anon, authenticated;
grant execute on function public.app_modulo_permitido_evento(public.papel_organizacao, text, text) to anon, authenticated;
grant execute on function public.app_pode_modulo_evento(text, text) to anon, authenticated;
grant execute on function public.app_pode_escrever_modulo_evento(text, text) to anon, authenticated;
grant execute on function public.app_pode_escrever_modulo_org(uuid, text) to anon, authenticated;
grant execute on function public.app_pode_ler_inscricoes_cronometragem(text) to anon, authenticated;


-- ============================================================
-- 6. ÍNDICES PARA AS RELAÇÕES DE EVENTO
-- ============================================================

create index if not exists ix_app_provas_evento_id on public.app_provas (evento_id);
create index if not exists ix_app_inscricoes_evento_id on public.app_inscricoes (evento_id);
create index if not exists ix_app_publicacoes_prova_id on public.app_publicacoes (prova_id);
create index if not exists ix_app_pagamentos_inscricao_id on public.app_pagamentos (inscricao_id);
create index if not exists ix_app_resultados_inscricao_id on public.app_resultados (inscricao_id);
create index if not exists ix_app_dorsais_inscricao_id on public.app_dorsais (inscricao_id);
create index if not exists ix_app_qrcodes_inscricao_id on public.app_qrcodes (inscricao_id);
create index if not exists ix_app_faixas_numeracao_evento_id on public.app_faixas_numeracao (evento_id);
create index if not exists ix_app_galeria_evento_id on public.app_galeria (evento_id);
create index if not exists ix_app_regulamentos_evento_id on public.app_regulamentos (evento_id);


-- ============================================================
-- 7. RLS — SUBSTITUIÇÃO DAS POLÍTICAS GENÉRICAS DA 0009 POR
--    POLÍTICAS COM ESCOPO ORGANIZAÇÃO + EVENTO + MÓDULO
--
-- MUDANÇA DO REPARO EM RELAÇÃO À 0010 ORIGINAL:
--   todo `create policy <novo_nome>` agora é precedido de
--   `drop policy if exists <novo_nome>` (além do drop do nome antigo),
--   tornando a seção 7 idempotente e eliminando o 42710.
-- ============================================================

-- ---------- 7.0 app_funcionario_eventos: próprio vínculo ou admin da org ----------
drop policy if exists app_funcionario_eventos_select on public.app_funcionario_eventos;
drop policy if exists app_funcionario_eventos_write on public.app_funcionario_eventos;
create policy app_funcionario_eventos_select on public.app_funcionario_eventos
  for select using (
    usuario_id = auth.uid()
    or app_pode_escrever_modulo_org(app_org_do_evento(evento_id), 'configuracoes')
  );
create policy app_funcionario_eventos_write on public.app_funcionario_eventos
  for all
  using (app_pode_escrever_modulo_org(app_org_do_evento(evento_id), 'configuracoes'))
  with check (app_pode_escrever_modulo_org(app_org_do_evento(evento_id), 'configuracoes'));

-- ---------- 7.1 app_eventos: leitura pública; escrita por org+módulo ----------
drop policy if exists app_eventos_write_escopo on public.app_eventos;
drop policy if exists app_eventos_write_papel on public.app_eventos;
create policy app_eventos_write_escopo on public.app_eventos
  for all
  using (app_pode_escrever_modulo_org(organizacao_id, 'eventos'))
  with check (app_pode_escrever_modulo_org(organizacao_id, 'eventos'));

-- ---------- 7.2 app_provas: leitura pública; escrita por evento+módulo ----------
drop policy if exists app_provas_write_escopo on public.app_provas;
drop policy if exists app_provas_write_papel on public.app_provas;
create policy app_provas_write_escopo on public.app_provas
  for all
  using (app_pode_escrever_modulo_evento(evento_id, 'provas'))
  with check (app_pode_escrever_modulo_evento(evento_id, 'provas'));

-- ---------- 7.3 app_inscricoes: módulo inscritos + dono + leitura da cronometragem ----------
drop policy if exists app_inscricoes_select on public.app_inscricoes;
drop policy if exists app_inscricoes_insert on public.app_inscricoes;
drop policy if exists app_inscricoes_update on public.app_inscricoes;
drop policy if exists app_inscricoes_delete on public.app_inscricoes;
create policy app_inscricoes_select on public.app_inscricoes
  for select using (
    app_pode_modulo_evento(evento_id, 'inscritos')
    or app_pode_ler_inscricoes_cronometragem(evento_id)
    or app_sou_dono_inscricao(id)
  );
create policy app_inscricoes_insert on public.app_inscricoes
  for insert with check (
    app_pode_escrever_modulo_evento(evento_id, 'inscritos')
    or app_sou_dono_atleta_nome(atleta_nome)
  );
create policy app_inscricoes_update on public.app_inscricoes
  for update
  using (
    app_pode_escrever_modulo_evento(evento_id, 'inscritos')
    or app_sou_dono_inscricao(id)
  )
  with check (
    app_pode_escrever_modulo_evento(evento_id, 'inscritos')
    or app_sou_dono_atleta_nome(atleta_nome)
  );
create policy app_inscricoes_delete on public.app_inscricoes
  for delete using (
    app_pode_escrever_modulo_evento(evento_id, 'inscritos')
    or app_sou_dono_inscricao(id)
  );

-- ---------- 7.4 app_pagamentos: módulo financeiro + dono ----------
drop policy if exists app_pagamentos_select on public.app_pagamentos;
drop policy if exists app_pagamentos_insert on public.app_pagamentos;
drop policy if exists app_pagamentos_update on public.app_pagamentos;
drop policy if exists app_pagamentos_delete on public.app_pagamentos;
create policy app_pagamentos_select on public.app_pagamentos
  for select using (
    app_pode_modulo_evento(app_evento_da_inscricao(inscricao_id), 'financeiro')
    or app_sou_dono_inscricao(inscricao_id)
  );
create policy app_pagamentos_insert on public.app_pagamentos
  for insert with check (
    app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'financeiro')
    or app_sou_dono_inscricao(inscricao_id)
  );
create policy app_pagamentos_update on public.app_pagamentos
  for update
  using (
    app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'financeiro')
    or app_sou_dono_inscricao(inscricao_id)
  )
  with check (
    app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'financeiro')
    or app_sou_dono_inscricao(inscricao_id)
  );
create policy app_pagamentos_delete on public.app_pagamentos
  for delete using (
    app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'financeiro')
    or app_sou_dono_inscricao(inscricao_id)
  );

-- ---------- 7.5 app_resultados: leitura staff-do-evento ou dono; escrita por módulo ----------
drop policy if exists app_resultados_select on public.app_resultados;
drop policy if exists app_resultados_write on public.app_resultados;
create policy app_resultados_select on public.app_resultados
  for select using (
    app_pode_evento(app_evento_da_inscricao(inscricao_id))
    or app_sou_dono_inscricao(inscricao_id)
  );
create policy app_resultados_write on public.app_resultados
  for all
  using (app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'resultados'))
  with check (app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'resultados'));

-- ---------- 7.6 app_publicacoes: leitura pública; escrita por módulo resultados ----------
drop policy if exists app_publicacoes_write_escopo on public.app_publicacoes;
drop policy if exists app_publicacoes_write_papel on public.app_publicacoes;
create policy app_publicacoes_write_escopo on public.app_publicacoes
  for all
  using (app_pode_escrever_modulo_evento(app_evento_da_prova(prova_id), 'resultados'))
  with check (app_pode_escrever_modulo_evento(app_evento_da_prova(prova_id), 'resultados'));

-- ---------- 7.7 app_faixas_numeracao: leitura staff-do-evento; escrita por módulo provas ----------
drop policy if exists app_faixas_numeracao_select on public.app_faixas_numeracao;
drop policy if exists app_faixas_numeracao_write on public.app_faixas_numeracao;
create policy app_faixas_numeracao_select on public.app_faixas_numeracao
  for select using (app_pode_evento(evento_id));
create policy app_faixas_numeracao_write on public.app_faixas_numeracao
  for all
  using (app_pode_escrever_modulo_evento(evento_id, 'provas'))
  with check (app_pode_escrever_modulo_evento(evento_id, 'provas'));

-- ---------- 7.8 app_dorsais: leitura staff-do-evento ou dono; escrita por módulo kits ----------
drop policy if exists app_dorsais_select on public.app_dorsais;
drop policy if exists app_dorsais_write on public.app_dorsais;
create policy app_dorsais_select on public.app_dorsais
  for select using (
    app_pode_evento(app_evento_da_inscricao(inscricao_id))
    or app_sou_dono_inscricao(inscricao_id)
  );
create policy app_dorsais_write on public.app_dorsais
  for all
  using (app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'kits'))
  with check (app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'kits'));

-- ---------- 7.9 app_galeria: público só 'publica'; staff-do-evento vê o resto; escrita por módulo eventos ----------
drop policy if exists app_galeria_select_escopo on public.app_galeria;
drop policy if exists app_galeria_write_escopo on public.app_galeria;
drop policy if exists app_galeria_select_publica on public.app_galeria;
drop policy if exists app_galeria_write_papel on public.app_galeria;
create policy app_galeria_select_escopo on public.app_galeria
  for select using (visibilidade = 'publica' or app_pode_evento(evento_id));
create policy app_galeria_write_escopo on public.app_galeria
  for all
  using (app_pode_escrever_modulo_evento(evento_id, 'eventos'))
  with check (app_pode_escrever_modulo_evento(evento_id, 'eventos'));

-- ---------- 7.10 app_regulamentos: leitura pública; escrita por módulo eventos ----------
drop policy if exists app_regulamentos_write_escopo on public.app_regulamentos;
drop policy if exists app_regulamentos_write_papel on public.app_regulamentos;
create policy app_regulamentos_write_escopo on public.app_regulamentos
  for all
  using (app_pode_escrever_modulo_evento(evento_id, 'eventos'))
  with check (app_pode_escrever_modulo_evento(evento_id, 'eventos'));

-- ---------- 7.11 app_qrcodes: módulo inscritos + dono ----------
drop policy if exists app_qrcodes_select on public.app_qrcodes;
drop policy if exists app_qrcodes_insert on public.app_qrcodes;
drop policy if exists app_qrcodes_update on public.app_qrcodes;
drop policy if exists app_qrcodes_delete on public.app_qrcodes;
create policy app_qrcodes_select on public.app_qrcodes
  for select using (
    app_pode_modulo_evento(app_evento_da_inscricao(inscricao_id), 'inscritos')
    or app_sou_dono_inscricao(inscricao_id)
  );
create policy app_qrcodes_insert on public.app_qrcodes
  for insert with check (
    app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'inscritos')
    or app_sou_dono_inscricao(inscricao_id)
  );
create policy app_qrcodes_update on public.app_qrcodes
  for update
  using (
    app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'inscritos')
    or app_sou_dono_inscricao(inscricao_id)
  )
  with check (
    app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'inscritos')
    or app_sou_dono_inscricao(inscricao_id)
  );
create policy app_qrcodes_delete on public.app_qrcodes
  for delete using (
    app_pode_escrever_modulo_evento(app_evento_da_inscricao(inscricao_id), 'inscritos')
  );


-- ============================================================
-- 8. VALIDAÇÃO SUGERIDA (opcional, comentada)
--
-- -- Organizações por evento (esperado pós-reparo: 1 NULL — hskreu4u):
-- select count(*) from app_eventos where organizacao_id is null;
--
-- -- Funcionários sem vínculo auth (esperado: e-mails demo sem usuário):
-- select id, email, usuario_id from app_funcionarios;
--
-- -- Autorizações efetivas do usuário logado:
-- select * from app_eventos_autorizados();
-- select app_pode_modulo_evento('<evento_id>', 'financeiro');
--
-- -- Contagem de policies por tabela (esperado pós-reparo):
-- select schemaname, tablename, count(*) as policies
-- from pg_policies
-- where schemaname = 'public'
-- group by schemaname, tablename
-- order by tablename;
-- ============================================================
