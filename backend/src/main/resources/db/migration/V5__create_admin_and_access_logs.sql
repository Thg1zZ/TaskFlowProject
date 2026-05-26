-- V5: Criação das tabelas de auditoria administrativa e logs de acesso

-- Tabela para rastrear o último acesso dos usuários (usada nas estatísticas do admin)
CREATE TABLE user_access_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ip_hash VARCHAR(64),
    accessed_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_access_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela imutável de auditoria de ações administrativas
CREATE TABLE admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    admin_role VARCHAR(30) NOT NULL,
    target_user_id BIGINT,
    target_user_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    details VARCHAR(500),
    result VARCHAR(20) NOT NULL,
    ip_hash VARCHAR(64),
    performed_at TIMESTAMP NOT NULL
);

-- Índices especificados na Entidade JPA para otimização de consultas
CREATE INDEX idx_audit_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_target ON admin_audit_logs(target_user_id);
CREATE INDEX idx_audit_time ON admin_audit_logs(performed_at);
CREATE INDEX idx_audit_action ON admin_audit_logs(action);
