-- Adiciona campos de termos e LGPD na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(10);

-- Cria a tabela de blacklist de emails
CREATE TABLE IF NOT EXISTS blacklisted_emails (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    deleted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    reason VARCHAR(255)
);

-- Cria índice único na blacklist
CREATE UNIQUE INDEX IF NOT EXISTS idx_blacklisted_email ON blacklisted_emails (email);
