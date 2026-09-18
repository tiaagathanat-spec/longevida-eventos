-- ============================================================
-- 0023 — Financeiro: formas múltiplas de pagamento + crédito
-- pré-existente de cliente
--
-- OBJETIVO:
--   * app_pagamentos passa a guardar VÁRIAS formas de pagamento na
--     mesma transação (ex.: R$ 50 PIX + R$ 30 dinheiro), cada uma com
--     seu valor, além de uma observação livre. Nada é substituído por
--     texto: cada forma/valor fica num objeto separado em `itens`
--     (jsonb), preservando `forma_pagamento` e `valor` legados para
--     compatibilidade com telas antigas.
--   * Cria o saldo de CRÉDITO PRÉ-EXISTENTE do cliente
--     (app_creditos) e o histórico de movimentações de crédito
--     (app_credito_movimentacoes): concedido / utilizado / estornado,
--     com saldo_apos e a transação/inscrição relacionada.
--
-- INTEGRIDADE:
--   * `app_creditos.saldo >= 0` via CHECK — o banco nunca aceita saldo
--     negativo (a utilização de crédito é sempre validada também na
--     UI/store contra o saldo disponível).
--   * Estorno (edição/cancelamento de pagamento que usou crédito)
--     devolve o valor ao saldo por uma movimentação `estornado` — a
--     "dupla utilização" não acontece porque o uso é sempre abatido do
--     saldo antes de virar item do pagamento.
--
-- PADRÕES (iguais às demais migrations app_*):
--   * Aditivo e idempotente (add column if not exists / create table
--     if not exists).
--   * RLS liberado aos papéis do módulo financeiro
--     (public.app_pode_esc_financeiro) — crédito é gestão financeira.
--   * Grants idênticos às demais app_* (authenticated).
-- ============================================================

-- ---------- 1. app_pagamentos: formas múltiplas + observação ----------
alter table public.app_pagamentos
  add column if not exists itens jsonb not null default '[]'::jsonb,
  add column if not exists observacao text not null default '',
  add column if not exists cliente_id text not null default '';

-- ---------- 2. Saldo de crédito do cliente ----------
create table if not exists public.app_creditos (
  cliente_id text primary key,
  saldo numeric(10, 2) not null default 0 check (saldo >= 0)
);

-- ---------- 3. Histórico de movimentações de crédito ----------
create table if not exists public.app_credito_movimentacoes (
  id text primary key,
  cliente_id text not null,
  data text not null default '',
  valor numeric(10, 2) not null default 0,
  tipo text not null default 'utilizado',
  saldo_apos numeric(10, 2) not null default 0,
  motivo text not null default '',
  inscricao_id text not null default '',
  referencia text not null default ''
);

-- ---------- 4. RLS ----------
alter table public.app_creditos enable row level security;
alter table public.app_credito_movimentacoes enable row level security;

drop policy if exists app_creditos_select on public.app_creditos;
drop policy if exists app_creditos_write on public.app_creditos;
drop policy if exists app_credito_movimentacoes_select on public.app_credito_movimentacoes;
drop policy if exists app_credito_movimentacoes_write on public.app_credito_movimentacoes;

-- Leitura: papéis do módulo financeiro (quem gerencia crédito).
create policy app_creditos_select on public.app_creditos
  for select using (public.app_pode_esc_financeiro());
create policy app_creditos_write on public.app_creditos
  for all using (public.app_pode_esc_financeiro())
  with check (public.app_pode_esc_financeiro());

create policy app_credito_movimentacoes_select on public.app_credito_movimentacoes
  for select using (public.app_pode_esc_financeiro());
create policy app_credito_movimentacoes_write on public.app_credito_movimentacoes
  for all using (public.app_pode_esc_financeiro())
  with check (public.app_pode_esc_financeiro());

-- ---------- 5. Grants ----------
grant select, insert, update, delete on public.app_creditos to authenticated;
grant select, insert, update, delete on public.app_credito_movimentacoes to authenticated;