-- ============================================================
-- Task Manager — Schema PostgreSQL v3 (security hardened)
-- OWASP ASVS v4.0 L2 · LGPD
-- ============================================================

-- ============================================================
-- USUÁRIOS DO BANCO
-- [ASVS 14.3.2] Princípio do mínimo privilégio:
--   - app_user: apenas DML nas tabelas da aplicação (sem DDL)
--   - migrations rodadas por um usuário separado com privilégios DDL
-- ============================================================
-- Execute como superuser antes de rodar este schema:
--
-- CREATE USER app_user WITH PASSWORD 'troque_por_senha_forte';
-- GRANT CONNECT ON DATABASE taskmanager TO app_user;
-- GRANT USAGE ON SCHEMA public TO app_user;
-- -- Após criar as tabelas:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- ============================================================
-- TABELA: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL     PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password      VARCHAR(255)  NOT NULL,  -- BCrypt hash (60 chars), 255 por segurança
    bio           VARCHAR(200),
    job_title     VARCHAR(50),
    -- [VULN-03 FIX] Limite reduzido de 1.4 MB para 65535 chars (~50 KB Base64 de avatar).
    -- Ideal em produção: mover para S3/R2 e armazenar apenas URL VARCHAR(512).
    profile_image VARCHAR(65535),
    -- [ASVS 4.1] Controle de Acesso Baseado em Perfis (RBAC).
    role          VARCHAR(20)   NOT NULL DEFAULT 'ROLE_USER',
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),

    -- [ASVS 2.5.3] Suporte a lockout de conta (implementar no backend)
    failed_login_attempts INTEGER  NOT NULL DEFAULT 0,
    locked_until          TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- TABELA: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id         BIGSERIAL   PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    color      VARCHAR(7)  NOT NULL DEFAULT '#3b82f6'
                           CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),  -- valida hex no banco
    icon       VARCHAR(10),
    created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(name, user_id)
);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- ============================================================
-- TIPOS ENUM
-- ============================================================
DO $$ BEGIN
    CREATE TYPE task_status   AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
    CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABELA: tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id                BIGSERIAL      PRIMARY KEY,
    title             VARCHAR(200)   NOT NULL CHECK (length(trim(title)) > 0),
    description       TEXT           CHECK (length(description) <= 2000),  -- limite no banco
    status            task_status    NOT NULL DEFAULT 'TODO',
    priority          task_priority  NOT NULL DEFAULT 'MEDIUM',
    start_date        DATE,
    end_date          DATE,
    due_date          DATE,
    -- [ASVS] Constraint de data: start não pode ser depois de end
    CONSTRAINT chk_task_dates CHECK (
        start_date IS NULL OR end_date IS NULL OR start_date <= end_date
    ),
    -- [VULN-09 FIX] Limite superior adicionado: max 43200 min = 30 dias
    estimated_minutes INTEGER        CHECK (estimated_minutes IS NULL OR (estimated_minutes > 0 AND estimated_minutes <= 43200)),
    created_at        TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP      NOT NULL DEFAULT NOW(),
    user_id           BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id       BIGINT         REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id     ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);

-- ============================================================
-- TABELA: task_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS task_comments (
    id         BIGSERIAL  PRIMARY KEY,
    content    TEXT       NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 1000),
    created_at TIMESTAMP  NOT NULL DEFAULT NOW(),
    task_id    BIGINT     NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id    BIGINT     NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON task_comments(task_id);

-- ============================================================
-- TABELA: password_reset_tokens
-- (já existe na entidade Java — explicitada aqui para clareza)
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    -- [VULN-07 FIX] Armazena apenas o hash SHA-256 (64 chars hex) do token.
    -- O token plain-text é enviado por e-mail e nunca persistido.
    -- ASVS 2.5.4 / CWE-312 (Cleartext Storage of Sensitive Information)
    token_hash  CHAR(64)     NOT NULL UNIQUE,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expiry_date TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prt_user_id   ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
-- [ASVS 2.5.3] Remove tokens expirados automaticamente (requer pg_cron ou job externo)
-- DELETE FROM password_reset_tokens WHERE expiry_date < NOW();

-- ============================================================
-- TABELA: revoked_tokens  ← NOVA
-- [ASVS 3.3.1] Blacklist de JWTs revogados (troca de senha, logout)
-- Substitui a blacklist em memória do JwtTokenProvider em produção.
-- TTL: job periódico remove tokens com expires_at no passado.
-- ============================================================
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti        VARCHAR(36)  PRIMARY KEY,  -- UUID do claim `jti`
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    revoked_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP    NOT NULL  -- cópia do exp do JWT; usado para limpeza
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);
-- Job de limpeza (rodar via pg_cron ou cron externo):
-- DELETE FROM revoked_tokens WHERE expires_at < NOW();

-- ============================================================
-- TABELA: audit_log  ← NOVA
-- [ASVS 7.2.1] Registro imutável de operações sensíveis
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,   -- ex: 'PASSWORD_CHANGED', 'TASK_DELETED'
    target_type VARCHAR(50),             -- ex: 'TASK', 'USER'
    target_id   BIGINT,
    ip_address  VARCHAR(45),             -- IPv4 ou IPv6 mascarado
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    details     JSONB                    -- metadados adicionais sem PII
);
CREATE INDEX IF NOT EXISTS idx_audit_user_id   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action    ON audit_log(action);
-- [ASVS 7.2.1] Audit log deve ser append-only — sem UPDATE/DELETE para app_user
-- REVOKE UPDATE, DELETE ON audit_log FROM app_user;

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW-LEVEL SECURITY (RLS)
-- [ALTO CORRIGIDO / ASVS 14.3] Isolamento de dados por usuário no nível do banco.
-- Mesmo que a aplicação seja comprometida, um usuário não vê dados de outro.
--
-- COMO FUNCIONA: a app conecta como app_user e define a variável de sessão
-- app.current_user_id antes de qualquer query:
--   SET LOCAL app.current_user_id = '42';
-- O RLS usa esse valor para filtrar automaticamente todas as queries.
--
-- No Spring Boot, adicione um interceptor que executa o SET LOCAL
-- dentro de cada transação após a autenticação JWT.
-- ============================================================
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE revoked_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuário só acessa suas próprias linhas
CREATE POLICY tasks_isolation ON tasks
    USING (user_id = current_setting('app.current_user_id', true)::BIGINT);

CREATE POLICY categories_isolation ON categories
    USING (user_id = current_setting('app.current_user_id', true)::BIGINT);

CREATE POLICY comments_isolation ON task_comments
    USING (user_id = current_setting('app.current_user_id', true)::BIGINT);

CREATE POLICY revoked_tokens_isolation ON revoked_tokens
    USING (user_id = current_setting('app.current_user_id', true)::BIGINT);

-- Superuser e o usuário de migrations bypassam RLS (comportamento padrão do Postgres)
-- Para o usuário de app, force sempre o RLS:
-- ALTER TABLE tasks          FORCE ROW LEVEL SECURITY;
-- ALTER TABLE categories     FORCE ROW LEVEL SECURITY;
-- ALTER TABLE task_comments  FORCE ROW LEVEL SECURITY;

-- ============================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE + SEGURANÇA
-- ============================================================
-- Full-text search seguro (evita LIKE '%...%' com índice seq scan)
CREATE INDEX IF NOT EXISTS idx_tasks_title_fts
    ON tasks USING gin(to_tsvector('portuguese', title));

-- ============================================================
-- DADOS DE SEED
-- [CRÍTICO CORRIGIDO] Hash REMOVIDO do schema.
-- O seed do admin é responsabilidade exclusiva do TaskManagerApplication.java
-- que já faz upsert no boot com a senha correta.
-- Commitar hashes em repositórios Git é um risco de segurança:
-- qualquer clone do repo expõe o hash para ataque offline de dicionário.
-- ============================================================
-- REMOVIDO INTENCIONALMENTE:
-- INSERT INTO users (name, email, password, ...) VALUES ('Admin', ..., '$2a$10$...')
