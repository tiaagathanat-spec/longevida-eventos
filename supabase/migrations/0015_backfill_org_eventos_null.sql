-- ============================================================
-- Longevida Eventos — 0015: Backfill de organização dos eventos
-- que ainda estavam sem organizacao_id em PRODUÇÃO
--
-- CONTEXTO: a 0014 preencheu organizacao_id dos eventos seed
-- "1","2","3" (presentes apenas como EVENTOS_INICIAIS no front-end).
-- Em PRODUÇÃO, porém, os únicos eventos são `bbo2gmwd` (2º Aquathlon,
-- já backfillado pela 0010) e `hskreu4u` ("copa natação"), que ficou
-- sem organização e por isso NUNCA pode ser editado pelo admin
-- (RLS app_eventos_write_escopo exige app_pode_escrever_modulo_org).
--
-- Este backfill atribui a organização "Espaço Longevida" a qualquer
-- evento de produção ainda órfão (organizacao_id IS NULL). A operação
-- é conservadora:
--   * só roda se a organização "Espaço Longevida" existir;
--   * não toca eventos já com organização;
--   * não cria nem altera nenhuma policy RLS (políticas da 0009/0010).
-- ============================================================

update public.app_eventos e
set organizacao_id = o.id
from public.organizacoes o
where o.id = 'da4938f9-7b9d-41b5-b508-57fa17a5a7cd'
  and o.nome = 'Espaço Longevida'
  and e.organizacao_id is null;
