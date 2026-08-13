-- ============================================================
-- ROLLBACK 0010 — restaurar o estado PÓS-0009
-- PRODUÇÃO. Execute SOMENTE se a 0010 causar problema.
-- Aplicar SEMPRE antes de qualquer rollback da 0009.
--
-- Objetivo: remover escopo org/evento e devolver as policies da 0009.
-- Não toca em dados pré-existentes (backfill é derivado e reversível).
-- ============================================================

-- 1. RESTAURA AS POLICIES DA 0009 (remove as de escopo da 0010)

-- app_eventos (volta a policy de escrita por papel da 0009)
drop policy if exists app_eventos_write_escopo on public.app_eventos;
create policy app_eventos_write_papel on public.app_eventos
  for all using (app_pode_esc_catalogo()) with check (app_pode_esc_catalogo());

-- app_provas
drop policy if exists app_provas_write_escopo on public.app_provas;
create policy app_provas_write_papel on public.app_provas
  for all using (app_pode_esc_catalogo()) with check (app_pode_esc_catalogo());

-- app_publicacoes
drop policy if exists app_publicacoes_write_escopo on public.app_publicacoes;
create policy app_publicacoes_write_papel on public.app_publicacoes
  for all using (app_pode_esc_resultados()) with check (app_pode_esc_resultados());

-- app_regulamentos
drop policy if exists app_regulamentos_write_escopo on public.app_regulamentos;
create policy app_regulamentos_write_papel on public.app_regulamentos
  for all using (app_pode_esc_catalogo()) with check (app_pode_esc_catalogo());

-- app_galeria
drop policy if exists app_galeria_select_escopo on public.app_galeria;
drop policy if exists app_galeria_write_escopo on public.app_galeria;
create policy app_galeria_select_publica on public.app_galeria
  for select using (visibilidade = 'publica' or app_eh_staff());
create policy app_galeria_write_papel on public.app_galeria
  for all using (app_pode_esc_catalogo()) with check (app_pode_esc_catalogo());

-- app_faixas_numeracao
drop policy if exists app_faixas_numeracao_select on public.app_faixas_numeracao;
drop policy if exists app_faixas_numeracao_write on public.app_faixas_numeracao;
create policy app_faixas_numeracao_select on public.app_faixas_numeracao
  for select using (app_eh_staff());
create policy app_faixas_numeracao_write on public.app_faixas_numeracao
  for all using (app_pode_esc_catalogo()) with check (app_pode_esc_catalogo());

-- app_inscricoes
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

-- app_pagamentos
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

-- app_resultados
drop policy if exists app_resultados_select on public.app_resultados;
drop policy if exists app_resultados_write on public.app_resultados;
create policy app_resultados_select on public.app_resultados
  for select using (app_eh_staff() or app_sou_dono_inscricao(inscricao_id));
create policy app_resultados_write on public.app_resultados
  for all using (app_pode_esc_resultados()) with check (app_pode_esc_resultados());

-- app_dorsais
drop policy if exists app_dorsais_select on public.app_dorsais;
drop policy if exists app_dorsais_write on public.app_dorsais;
create policy app_dorsais_select on public.app_dorsais
  for select using (app_eh_staff() or app_sou_dono_inscricao(inscricao_id));
create policy app_dorsais_write on public.app_dorsais
  for all using (app_pode_esc_kits()) with check (app_pode_esc_kits());

-- app_qrcodes
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

-- app_funcionario_eventos: remove policies da junção
drop policy if exists app_funcionario_eventos_select on public.app_funcionario_eventos;
drop policy if exists app_funcionario_eventos_write on public.app_funcionario_eventos;

-- 2. FUNÇÕES DA 0010 (remoção limpa; nada da 0009 referencia)
drop function if exists public.app_pode_ler_inscricoes_cronometragem(text);
drop function if exists public.app_pode_escrever_modulo_org(uuid, text);
drop function if exists public.app_pode_escrever_modulo_evento(text, text);
drop function if exists public.app_pode_modulo_evento(text, text);
drop function if exists public.app_modulo_permitido_evento(public.papel_organizacao, text, text);
drop function if exists public.app_pode_evento(text);
drop function if exists public.app_eventos_autorizados();
drop function if exists public.app_evento_autorizado(text);
drop function if exists public.app_evento_da_prova(text);
drop function if exists public.app_evento_da_inscricao(text);
drop function if exists public.app_org_do_evento(text);
drop function if exists public.app_permissoes_do_papel(public.papel_organizacao);
drop function if exists public.app_papel_na_org(uuid);

-- 3. TRIGGER + TABELA DA JUNÇÃO (nova, vazia; remove sem perder dados legados)
drop trigger if exists trg_app_funcionario_eventos_updated_at on public.app_funcionario_eventos;
drop table if exists public.app_funcionario_eventos;
drop function if exists public.app_atualizar_updated_at();

-- 4. COLUNAS DA 0010 (FK primeiro; backfill é derivado, reversível)
alter table public.app_eventos
  drop constraint if exists app_eventos_organizacao_id_fkey;
alter table public.app_eventos
  drop column if exists organizacao_id;

alter table public.app_funcionarios
  drop constraint if exists app_funcionarios_usuario_id_fkey;
alter table public.app_funcionarios
  drop column if exists usuario_id;

-- 5. ÍNDICES DA 0010
drop index if exists public.ix_app_eventos_organizacao_id;
drop index if exists public.ix_app_funcionarios_usuario_id;
drop index if exists public.ix_app_funcionario_eventos_evento_id;
drop index if exists public.ix_app_provas_evento_id;
drop index if exists public.ix_app_inscricoes_evento_id;
drop index if exists public.ix_app_publicacoes_prova_id;
drop index if exists public.ix_app_pagamentos_inscricao_id;
drop index if exists public.ix_app_resultados_inscricao_id;
drop index if exists public.ix_app_dorsais_inscricao_id;
drop index if exists public.ix_app_qrcodes_inscricao_id;
drop index if exists public.ix_app_faixas_numeracao_evento_id;
drop index if exists public.ix_app_galeria_evento_id;
drop index if exists public.ix_app_regulamentos_evento_id;

-- 6. VALIDAÇÃO PÓS-ROLLBACK (rodar a 01_validacao_pos_0009.sql)
-- Esperado: o banco volta exatamente ao estado criado pela 0009.
