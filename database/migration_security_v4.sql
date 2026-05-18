-- ============================================================
-- MIGRAÇÃO DE SEGURANÇA v4 — Security Hardening Patch
-- Task Manager · 2026-05-18
-- Execute como usuário com privilégios DDL (não app_user)
-- ============================================================

-- ─── 1. VULN-07 FIX: Renomear coluna token → token_hash ─────────────────────
-- O token de reset agora é armazenado como hash SHA-256 (64 chars hex).
-- Tokens existentes em texto claro devem ser invalidados (DROP + recriar).
-- ----------------------------------------------------------------------------

-- Opção A — Banco em produção SEM dados de reset ativos (recomendado):
-- Invalida todos os tokens de reset pendentes (forçar novo "esqueci a senha").
TRUNCATE TABLE password_reset_tokens;

ALTER TABLE password_reset_tokens
    DROP COLUMN IF EXISTS token;

ALTER TABLE password_reset_tokens
    ADD COLUMN token_hash CHAR(64) NOT NULL DEFAULT '' UNIQUE;

-- Remove o DEFAULT temporário usado apenas para o ADD COLUMN
ALTER TABLE password_reset_tokens
    ALTER COLUMN token_hash DROP DEFAULT;

-- Índice para busca por hash
DROP INDEX IF EXISTS idx_prt_user_id;
CREATE INDEX IF NOT EXISTS idx_prt_user_id    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_token_hash  ON password_reset_tokens(token_hash);

-- ─── 2. VULN-03 FIX: Limitar profile_image a 65535 chars (~50 KB) ────────────
-- Se existirem linhas com imagens maiores, elas precisam ser migradas primeiro.
-- Execute o SELECT abaixo para verificar:
--   SELECT id, length(profile_image) FROM users WHERE length(profile_image) > 65535;
-- Se não houver resultados, prossiga com o ALTER:

ALTER TABLE users
    ALTER COLUMN profile_image TYPE VARCHAR(65535);

-- ─── 3. VULN-09 FIX: Limitar estimated_minutes ≤ 43200 (30 dias) ────────────
-- Remove a constraint antiga e adiciona a nova com limite superior.
ALTER TABLE tasks
    DROP CONSTRAINT IF EXISTS tasks_estimated_minutes_check;

ALTER TABLE tasks
    ADD CONSTRAINT tasks_estimated_minutes_check
    CHECK (estimated_minutes IS NULL OR (estimated_minutes > 0 AND estimated_minutes <= 43200));

-- ─── 4. ASVS 4.1 FIX: Adicionar coluna de role ──────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER';

-- ─── 4. Verificação pós-migração ─────────────────────────────────────────────
-- Execute após a migração para confirmar o estado:
SELECT
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'password_reset_tokens'
ORDER BY ordinal_position;

SELECT
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'profile_image';

SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'tasks'::regclass
  AND conname = 'tasks_estimated_minutes_check';
