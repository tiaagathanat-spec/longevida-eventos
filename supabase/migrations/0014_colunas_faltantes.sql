-- ============================================================
-- Longevida Eventos — 0014: Colunas faltantes das tabelas-espelho
--
-- OBJETIVO: corrigir o esquema das tabelas `app_*` para refletir
-- EXATAMENTE os campos que as telas enviam no upsert
-- (lib/mock/*-store.tsx). As colunas abaixo foram adicionadas à
-- interface DEPOIS da migration 0005 (que criou as tabelas) e nunca
-- foram migradas para o banco — por isso todo upsert que incluía um
-- desses campos falhava com 42703 (coluna inexistente), abortando o
-- loop de gravação do `gravarLinhas` e fazendo "provas novas e
-- alterações nos eventos não salvarem" (somem ao recarregar).
--
-- Mudanças (aditivas e idempotentes, sem DROP e sem tocar em RLS):
--   * app_eventos:   endereco_* (7 campos de endereço estruturado
--                    rua/quadra/lote/cep/setor/cidade/UF — feature
--                    "localização do evento" com mapa Google).
--   * app_provas:    tipo_identificacao ('dorsal'|'card'), situacao
--                    ('nao_iniciada'|'em_andamento'|'encerrada') e a
--                    auditoria da transição (quem/quando).
--   * app_resultados: cronometrista, capturado_em e tempo_anterior
--                    (auditoria de captura do módulo Cronometragem).
--   * app_dorsais:   auditoria (jsonb) das entregas/check-in.
--   * app_galeria:   tipo ('imagem'|'video').
--
-- Backfill conservador de ORGANIZAÇÃO (eventos seed): os eventos de
-- demonstração "1", "2" e "3" nasceram sem organizacao_id (0005, antes
-- do conceito de organização). Com o RLS por escopo (0009/0010), um
-- evento sem organização NÃO pode ser editado por ninguém
-- (app_pode_escrever_modulo_org(NULL, ...) = false) — era a segunda
-- causa de "alterações nos eventos não salvam". O `local` dos três
-- referencia explicitamente "Espaço Longevida", a organização do
-- usuário; atribuir a organização real torna-os editáveis pelo admin.
--
-- PADRÕES DE SEGURANÇA:
--   * Defaults TEXT (`not null default ''`) espelham o padrão das
--     demais colunas da 0005 (limparJson omite undefined na origem).
--   * NENHUMA policy RLS é alterada aqui (políticas da 0009/0010
--     permanecem). As colunas novas são cobertas pelos grants de
--     tabela existentes (grants são por tabela, não por coluna).
--   * Backfill idêntico ao da 0010: só preenche onde está vazio e
--     apenas quando a organização "Espaço Longevida" existe.
-- ============================================================

-- ---------- 1. app_eventos: endereço estruturado (mapa) ----------
alter table public.app_eventos
  add column if not exists endereco_rua text not null default '',
  add column if not exists endereco_quadra text not null default '',
  add column if not exists endereco_lote text not null default '',
  add column if not exists endereco_cep text not null default '',
  add column if not exists endereco_setor text not null default '',
  add column if not exists endereco_cidade text not null default '',
  add column if not exists endereco_estado text not null default '';

-- ---------- 2. app_provas: identificação + situação da prova ----------
alter table public.app_provas
  add column if not exists tipo_identificacao text not null default 'dorsal',
  add column if not exists situacao text not null default 'nao_iniciada',
  add column if not exists situacao_alterada_por text not null default '',
  add column if not exists situacao_alterada_em text not null default '';

-- ---------- 3. app_resultados: auditoria da captura (Cronometragem) ----------
alter table public.app_resultados
  add column if not exists cronometrista text,
  add column if not exists capturado_em text,
  add column if not exists tempo_anterior text;

-- ---------- 4. app_dorsais: auditoria das entregas / check-in ----------
alter table public.app_dorsais
  add column if not exists auditoria jsonb not null default '[]'::jsonb;

-- ---------- 5. app_galeria: tipo de mídia (imagem | vídeo) ----------
alter table public.app_galeria
  add column if not exists tipo text not null default 'imagem';

-- ---------- 6. Backfill conservador: organização dos eventos seed ----------
-- Aplica SOMENTE aos eventos de demonstração (1, 2, 3) e somente
-- quando a organização "Espaço Longevida" existir e o evento ainda
-- estiver sem organizacao_id. Nenhum outro evento é tocado.
update public.app_eventos e
set organizacao_id = o.id
from public.organizacoes o
where o.id = 'da4938f9-7b9d-41b5-b508-57fa17a5a7cd'
  and o.nome = 'Espaço Longevida'
  and e.id in ('1', '2', '3')
  and e.organizacao_id is null;
