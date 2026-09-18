-- ============================================================
-- 0024 — Campo observações na tabela app_inscricoes
--
-- OBJETIVO:
--   Adicionar coluna observacoes (text) à tabela app_inscricoes
--   para armazenar observações internas da inscrição.
--
-- PADRÕES:
--   * Aditivo e idempotente (add column if not exists).
--   * RLS herdado da tabela existente.
-- ============================================================

-- Coluna observacoes (texto livre, opcional)
ALTER TABLE app_inscricoes
  ADD COLUMN IF NOT EXISTS observacoes text;
