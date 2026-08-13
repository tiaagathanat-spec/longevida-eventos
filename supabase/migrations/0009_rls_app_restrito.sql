-- ============================================================
-- Longevida Eventos — 0009: RLS restritivo nas tabelas app_*
--
-- OBJETIVO (ETAPA 2 do plano de segurança):
--   * Remover o acesso público/anon às tabelas sensíveis
--     (atletas, perfis, inscricoes, pagamentos, resultados,
--      dorsais, faixas_numeracao, qrcodes, funcionarios).
--   * Restringir anon a LEITURA dos catálogos genuinamente
--     públicos (eventos, provas, categorias, modalidades,
--      tipos_prova, publicacoes, galeria publica, regulamentos,
--      patrocinadores).
--   * Acesso por PAPEL REAL via RLS baseado em:
--       - usuario autenticado (auth.uid() / auth.email());
--       - papel do vínculo em organizacao_usuarios (admin,
--         organizador, cronometragem, financeiro, leitura);
--       - permissão de ESCRITA por módulo (espelhando
--         PERMISSOES_POR_PAPEL da UI);
--       - "dono" (atleta/responsável) via e-mail e
--         responsavel_nome.
--
-- SUBSTITUI as políticas permissivas da 0005 e reajusta os
-- GRANTs da 0006.
--
-- IDEMPOTENTE: todas as políticas criadas aqui são precedidas de
-- DROP POLICY IF EXISTS, funções usam CREATE OR REPLACE, e
-- GRANT/REVOKE são comutativos.
-- ============================================================


-- ============================================================
-- 1. FUNÇÕES AUXILIARES (SECURITY DEFINER)
--
-- Todas usam `set search_path = ''` e referências qualificadas
-- (public.*, auth.*) para não dependerem do search_path do
-- chamador — evita captura de tabelas maliciosas e uso indevido
-- da elevação de privilégio. EXECUTE negado ao papel PUBLIC e
-- concedido apenas a anon/authenticated.
-- ============================================================

-- Papel do vínculo do usuário autenticado (qualquer organização).
-- ATENÇÃO (limitação documentada): app_* NÃO possui coluna
-- organizacao_id, então não há como isolar dados por organização.
-- Se o usuário tiver vínculos em mais de uma organização, este
-- helper considera o primeiro encontrado (comportamento idêntico
-- ao useUsuarioOrganizacao da UI, que usa maybeSingle()).
create or replace function public.app_papel_atual()
returns public.papel_organizacao language sql stable security definer
set search_path = '' as $$
  select ou.papel
  from public.organizacao_usuarios ou
  where ou.usuario_id = auth.uid()
  limit 1;
$$;

-- O usuário autenticado tem qualquer vínculo de equipe?
create or replace function public.app_eh_staff()
returns boolean language sql stable security definer
set search_path = '' as $$
  select public.app_papel_atual() is not null;
$$;

-- Nome do usuário autenticado em public.usuarios (criado pelo
-- trigger de signup da 0002). Usado para casar responsavel_nome.
create or replace function public.app_usuario_atual_nome()
returns text language sql stable security definer
set search_path = '' as $$
  select nome from public.usuarios where id = auth.uid();
$$;

-- ---- Permissões de ESCRITA por módulo (espelham o papel real).
-- Um papel só escreve nos módulos que possui; "leitura" nunca
-- escreve. A leitura (SELECT) é separada e tratada nas políticas.

-- Módulos eventos/provas (catálogos, galeria, regulamentos, faixas).
create or replace function public.app_pode_esc_catalogo()
returns boolean language sql stable security definer
set search_path = '' as $$
  select public.app_papel_atual() in ('administrador', 'organizador', 'cronometragem', 'financeiro');
$$;

-- Módulo inscritos (inscricoes, atletas, perfis, qrcodes/check-in).
create or replace function public.app_pode_esc_inscritos()
returns boolean language sql stable security definer
set search_path = '' as $$
  select public.app_papel_atual() in ('administrador', 'organizador', 'financeiro');
$$;

-- Módulo kits (dorsais / entrega de kits).
create or replace function public.app_pode_esc_kits()
returns boolean language sql stable security definer
set search_path = '' as $$
  select public.app_papel_atual() in ('administrador', 'organizador');
$$;

-- Módulos resultados/classificacao/cronometragem.
create or replace function public.app_pode_esc_resultados()
returns boolean language sql stable security definer
set search_path = '' as $$
  select public.app_papel_atual() in ('administrador', 'organizador', 'cronometragem');
$$;

-- Módulo financeiro (pagamentos).
create or replace function public.app_pode_esc_financeiro()
returns boolean language sql stable security definer
set search_path = '' as $$
  select public.app_papel_atual() in ('administrador', 'financeiro');
$$;

-- Módulo configuracoes (funcionários/staff).
create or replace function public.app_pode_esc_config()
returns boolean language sql stable security definer
set search_path = '' as $$
  select public.app_papel_atual() = 'administrador';
$$;

-- ---- Dono (atleta/responsável).

-- O usuário autenticado é dono do atleta (e-mail do atleta = e-mail
-- do usuário, OU responsavel_nome = nome do usuário em usuarios)?
create or replace function public.app_sou_dono_atleta(
  p_email text,
  p_responsavel_nome text
)
returns boolean language sql stable security definer
set search_path = '' as $$
  select p_email = auth.email()
      or exists (
        select 1
        from public.usuarios u
        where u.id = auth.uid()
          and u.nome = p_responsavel_nome
          and p_responsavel_nome <> ''
      );
$$;

-- O atleta_nome informado (INSERT de app_inscricoes, quando a linha
-- ainda não existe) pertence ao usuário autenticado?
create or replace function public.app_sou_dono_atleta_nome(p_atleta_nome text)
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (
        select 1
        from public.app_atletas a
        where a.nome = p_atleta_nome
          and (
            a.email = auth.email()
            or (
              a.responsavel_nome <> ''
              and a.responsavel_nome = public.app_usuario_atual_nome()
            )
          )
      )
      or p_atleta_nome = public.app_usuario_atual_nome();
$$;

-- O usuário autenticado é dono da inscrição informada?
create or replace function public.app_sou_dono_inscricao(p_inscricao_id text)
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (
        select 1
        from public.app_inscricoes i
        join public.app_atletas a on a.nome = i.atleta_nome
        where i.id = p_inscricao_id
          and (
            a.email = auth.email()
            or (
              a.responsavel_nome <> ''
              and a.responsavel_nome = public.app_usuario_atual_nome()
            )
          )
      )
      or exists (
        select 1
        from public.app_inscricoes i
        where i.id = p_inscricao_id
          and i.atleta_nome = public.app_usuario_atual_nome()
      );
$$;

-- Contagem pública de inscritos confirmados de um evento. Expõe
-- APENAS o número (nenhuma linha), para o site público mostrar o
-- contador sem liberar acesso à tabela sensível app_inscricoes.
create or replace function public.app_inscritos_publicos(p_evento_id text)
returns bigint language sql stable security definer
set search_path = '' as $$
  select count(*)::bigint
  from public.app_inscricoes
  where evento_id = p_evento_id
    and status = 'confirmada';
$$;

-- Harden: nega EXECUTE ao papel PUBLIC e concede só às roles do app.
revoke all on function public.app_papel_atual() from public;
revoke all on function public.app_eh_staff() from public;
revoke all on function public.app_usuario_atual_nome() from public;
revoke all on function public.app_pode_esc_catalogo() from public;
revoke all on function public.app_pode_esc_inscritos() from public;
revoke all on function public.app_pode_esc_kits() from public;
revoke all on function public.app_pode_esc_resultados() from public;
revoke all on function public.app_pode_esc_financeiro() from public;
revoke all on function public.app_pode_esc_config() from public;
revoke all on function public.app_sou_dono_atleta(text, text) from public;
revoke all on function public.app_sou_dono_atleta_nome(text) from public;
revoke all on function public.app_sou_dono_inscricao(text) from public;
revoke all on function public.app_inscritos_publicos(text) from public;

grant execute on function public.app_papel_atual() to anon, authenticated;
grant execute on function public.app_eh_staff() to anon, authenticated;
grant execute on function public.app_usuario_atual_nome() to anon, authenticated;
grant execute on function public.app_pode_esc_catalogo() to anon, authenticated;
grant execute on function public.app_pode_esc_inscritos() to anon, authenticated;
grant execute on function public.app_pode_esc_kits() to anon, authenticated;
grant execute on function public.app_pode_esc_resultados() to anon, authenticated;
grant execute on function public.app_pode_esc_financeiro() to anon, authenticated;
grant execute on function public.app_pode_esc_config() to anon, authenticated;
grant execute on function public.app_sou_dono_atleta(text, text) to anon, authenticated;
grant execute on function public.app_sou_dono_atleta_nome(text) to anon, authenticated;
grant execute on function public.app_sou_dono_inscricao(text) to anon, authenticated;
grant execute on function public.app_inscritos_publicos(text) to anon, authenticated;


-- ============================================================
-- 2. REMOVE AS POLÍTICAS PERMISSIVAS DA 0005
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_categorias', 'app_modalidades', 'app_tipos_prova', 'app_eventos',
    'app_provas', 'app_atletas', 'app_perfis', 'app_inscricoes',
    'app_pagamentos', 'app_resultados', 'app_publicacoes',
    'app_faixas_numeracao', 'app_dorsais', 'app_galeria',
    'app_regulamentos', 'app_patrocinadores', 'app_qrcodes',
    'app_funcionarios'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_todos', t);
  end loop;
end $$;


-- ============================================================
-- 3. GRANTS
-- ============================================================

grant usage on schema public to anon, authenticated;

-- 3.1 REVOGA TODO o acesso do anon às app_* ...
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_categorias', 'app_modalidades', 'app_tipos_prova', 'app_eventos',
    'app_provas', 'app_atletas', 'app_perfis', 'app_inscricoes',
    'app_pagamentos', 'app_resultados', 'app_publicacoes',
    'app_faixas_numeracao', 'app_dorsais', 'app_galeria',
    'app_regulamentos', 'app_patrocinadores', 'app_qrcodes',
    'app_funcionarios'
  ] loop
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- 3.2 ... e devolve SÓ SELECT dos catálogos públicos.
grant select on public.app_categorias to anon;
grant select on public.app_modalidades to anon;
grant select on public.app_tipos_prova to anon;
grant select on public.app_eventos to anon;
grant select on public.app_provas to anon;
grant select on public.app_publicacoes to anon;
grant select on public.app_regulamentos to anon;
grant select on public.app_patrocinadores to anon;
grant select on public.app_galeria to anon;

-- 3.3 authenticated mantém GRANT amplo nas app_*; o RLS é quem
-- filtra por papel/dono (sem GRANT a tabela é inacessível mesmo
-- com política).
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_categorias', 'app_modalidades', 'app_tipos_prova', 'app_eventos',
    'app_provas', 'app_atletas', 'app_perfis', 'app_inscricoes',
    'app_pagamentos', 'app_resultados', 'app_publicacoes',
    'app_faixas_numeracao', 'app_dorsais', 'app_galeria',
    'app_regulamentos', 'app_patrocinadores', 'app_qrcodes',
    'app_funcionarios'
  ] loop
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated',
      t
    );
  end loop;
end $$;


-- ============================================================
-- 4. POLÍTICAS RLS (drop-if-exists antes de recriar)
-- ============================================================

-- 4.1 Catálogos públicos: SELECT para todos (site público), escrita
-- por papel (módulos eventos/provas). app_publicacoes tem escrita
-- restrita ao módulo resultados (tratada na 4.2).
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_categorias', 'app_modalidades', 'app_tipos_prova', 'app_eventos',
    'app_provas', 'app_regulamentos', 'app_patrocinadores'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_publico', t);
    execute format('drop policy if exists %I on public.%I', t || '_write_papel', t);
    execute format(
      'create policy %I on public.%I for select using (true)',
      t || '_select_publico', t
    );
    execute format(
      'create policy %I on public.%I for all using (app_pode_esc_catalogo()) with check (app_pode_esc_catalogo())',
      t || '_write_papel', t
    );
  end loop;
end $$;

-- 4.2 Publicações de resultados: leitura pública; escrita só para
-- papéis do módulo resultados.
drop policy if exists app_publicacoes_select_publico on public.app_publicacoes;
drop policy if exists app_publicacoes_write_papel on public.app_publicacoes;
create policy app_publicacoes_select_publico on public.app_publicacoes
  for select using (true);
create policy app_publicacoes_write_papel on public.app_publicacoes
  for all using (app_pode_esc_resultados()) with check (app_pode_esc_resultados());

-- 4.3 Galeria: público só vê visibilidade publica; escrita por papel
-- (módulos eventos).
drop policy if exists app_galeria_select_publica on public.app_galeria;
drop policy if exists app_galeria_write_papel on public.app_galeria;
create policy app_galeria_select_publica on public.app_galeria
  for select using (visibilidade = 'publica' or app_eh_staff());
create policy app_galeria_write_papel on public.app_galeria
  for all using (app_pode_esc_catalogo()) with check (app_pode_esc_catalogo());

-- 4.4 Faixas de numeração: leitura staff; escrita por papel (provas).
drop policy if exists app_faixas_numeracao_select on public.app_faixas_numeracao;
drop policy if exists app_faixas_numeracao_write on public.app_faixas_numeracao;
create policy app_faixas_numeracao_select on public.app_faixas_numeracao
  for select using (app_eh_staff());
create policy app_faixas_numeracao_write on public.app_faixas_numeracao
  for all using (app_pode_esc_catalogo()) with check (app_pode_esc_catalogo());

-- 4.5 Funcionários: leitura staff; escrita só administrador.
drop policy if exists app_funcionarios_select on public.app_funcionarios;
drop policy if exists app_funcionarios_write on public.app_funcionarios;
create policy app_funcionarios_select on public.app_funcionarios
  for select using (app_eh_staff());
create policy app_funcionarios_write on public.app_funcionarios
  for all using (app_pode_esc_config()) with check (app_pode_esc_config());

-- 4.6 Perfis: dono (e-mail do usuário autenticado) ou papéis do
-- módulo inscritos.
drop policy if exists app_perfis_select on public.app_perfis;
drop policy if exists app_perfis_insert on public.app_perfis;
drop policy if exists app_perfis_update on public.app_perfis;
drop policy if exists app_perfis_delete on public.app_perfis;
create policy app_perfis_select on public.app_perfis
  for select using (app_pode_esc_inscritos() or email = auth.email());
create policy app_perfis_insert on public.app_perfis
  for insert with check (app_pode_esc_inscritos() or email = auth.email());
create policy app_perfis_update on public.app_perfis
  for update using (app_pode_esc_inscritos() or email = auth.email())
  with check (app_pode_esc_inscritos() or email = auth.email());
create policy app_perfis_delete on public.app_perfis
  for delete using (app_pode_esc_inscritos() or email = auth.email());

-- 4.7 Atletas: dono (e-mail ou responsavel_nome) ou papéis do
-- módulo inscritos.
drop policy if exists app_atletas_select on public.app_atletas;
drop policy if exists app_atletas_insert on public.app_atletas;
drop policy if exists app_atletas_update on public.app_atletas;
drop policy if exists app_atletas_delete on public.app_atletas;
create policy app_atletas_select on public.app_atletas
  for select using (app_pode_esc_inscritos() or app_sou_dono_atleta(email, responsavel_nome));
create policy app_atletas_insert on public.app_atletas
  for insert with check (app_pode_esc_inscritos() or app_sou_dono_atleta(email, responsavel_nome));
create policy app_atletas_update on public.app_atletas
  for update using (app_pode_esc_inscritos() or app_sou_dono_atleta(email, responsavel_nome))
  with check (app_pode_esc_inscritos() or app_sou_dono_atleta(email, responsavel_nome));
create policy app_atletas_delete on public.app_atletas
  for delete using (app_pode_esc_inscritos() or app_sou_dono_atleta(email, responsavel_nome));

-- 4.8 Inscrições: dono da inscrição (via atleta) ou papéis do
-- módulo inscritos. O INSERT valida o atleta_nome (linha ainda não
-- existe); SELECT/UPDATE/DELETE validam por id. A expressão do
-- SELECT cobre o INSERT (o que o usuário insere, ele volta a ver).
drop policy if exists app_inscricoes_select on public.app_inscricoes;
drop policy if exists app_inscricoes_insert on public.app_inscricoes;
drop policy if exists app_inscricoes_update on public.app_inscricoes;
drop policy if exists app_inscricoes_delete on public.app_inscricoes;
create policy app_inscricoes_select on public.app_inscricoes
  for select using (app_pode_esc_inscritos() or app_sou_dono_inscricao(id));
create policy app_inscricoes_insert on public.app_inscricoes
  for insert with check (app_pode_esc_inscritos() or app_sou_dono_atleta_nome(atleta_nome));
create policy app_inscricoes_update on public.app_inscricoes
  for update using (app_pode_esc_inscritos() or app_sou_dono_inscricao(id))
  with check (app_pode_esc_inscritos() or app_sou_dono_atleta_nome(atleta_nome));
create policy app_inscricoes_delete on public.app_inscricoes
  for delete using (app_pode_esc_inscritos() or app_sou_dono_inscricao(id));

-- 4.9 Pagamentos: dono da inscrição vinculada ou papéis do módulo
-- financeiro.
drop policy if exists app_pagamentos_select on public.app_pagamentos;
drop policy if exists app_pagamentos_insert on public.app_pagamentos;
drop policy if exists app_pagamentos_update on public.app_pagamentos;
drop policy if exists app_pagamentos_delete on public.app_pagamentos;
create policy app_pagamentos_select on public.app_pagamentos
  for select using (app_pode_esc_financeiro() or app_sou_dono_inscricao(inscricao_id));
create policy app_pagamentos_insert on public.app_pagamentos
  for insert with check (app_pode_esc_financeiro() or app_sou_dono_inscricao(inscricao_id));
create policy app_pagamentos_update on public.app_pagamentos
  for update using (app_pode_esc_financeiro() or app_sou_dono_inscricao(inscricao_id))
  with check (app_pode_esc_financeiro() or app_sou_dono_inscricao(inscricao_id));
create policy app_pagamentos_delete on public.app_pagamentos
  for delete using (app_pode_esc_financeiro() or app_sou_dono_inscricao(inscricao_id));

-- 4.10 Resultados: leitura staff ou dono; escrita só papéis do
-- módulo resultados/cronometragem (portal nunca escreve resultados).
drop policy if exists app_resultados_select on public.app_resultados;
drop policy if exists app_resultados_write on public.app_resultados;
create policy app_resultados_select on public.app_resultados
  for select using (app_eh_staff() or app_sou_dono_inscricao(inscricao_id));
create policy app_resultados_write on public.app_resultados
  for all using (app_pode_esc_resultados()) with check (app_pode_esc_resultados());

-- 4.11 Dorsais: leitura staff ou dono; escrita só papéis do módulo
-- kits.
drop policy if exists app_dorsais_select on public.app_dorsais;
drop policy if exists app_dorsais_write on public.app_dorsais;
create policy app_dorsais_select on public.app_dorsais
  for select using (app_eh_staff() or app_sou_dono_inscricao(inscricao_id));
create policy app_dorsais_write on public.app_dorsais
  for all using (app_pode_esc_kits()) with check (app_pode_esc_kits());

-- 4.12 QR Codes: dono da inscrição lê/cria/edita o próprio QR
-- (geração lazy no portal); leituras/check-in (módulo inscritos)
-- pelos papéis com esse módulo; exclusão idem.
drop policy if exists app_qrcodes_select on public.app_qrcodes;
drop policy if exists app_qrcodes_insert on public.app_qrcodes;
drop policy if exists app_qrcodes_update on public.app_qrcodes;
drop policy if exists app_qrcodes_delete on public.app_qrcodes;
create policy app_qrcodes_select on public.app_qrcodes
  for select using (app_pode_esc_inscritos() or app_sou_dono_inscricao(inscricao_id));
create policy app_qrcodes_insert on public.app_qrcodes
  for insert with check (app_pode_esc_inscritos() or app_sou_dono_inscricao(inscricao_id));
create policy app_qrcodes_update on public.app_qrcodes
  for update using (app_pode_esc_inscritos() or app_sou_dono_inscricao(inscricao_id))
  with check (app_pode_esc_inscritos() or app_sou_dono_inscricao(inscricao_id));
create policy app_qrcodes_delete on public.app_qrcodes
  for delete using (app_pode_esc_inscritos());
