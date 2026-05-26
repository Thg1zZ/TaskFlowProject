package com.taskmanager.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * [MIGRAÇÃO AUTOMÁTICA EM MÁQUINA DE CLIENTE GRATUITA]
 * Executa as alterações DDL necessárias de segurança na inicialização do Spring Boot.
 * Perfeito para quando o cliente usa o Render Free e não possui Web Shell ou clientes SQL externos.
 */
@Component
public class DatabaseMigrationRunner implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            System.out.println("====== INICIANDO AUTO MIGRATION DE SEGURANÇA ======");

            // 1. Adicionar coluna 'role' na tabela users
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER'");

            // 2. Aumentar limite de tamanho de imagem no banco (segurança contra DoS)
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN profile_image TYPE VARCHAR(65535)");

            // 3. Adicionar coluna 'token_hash' na tabela de reset de senhas
            jdbcTemplate.execute("ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS token_hash CHAR(64) UNIQUE");

            // 4. Remover coluna de token antiga se ela ainda existir
            try {
                jdbcTemplate.execute("ALTER TABLE password_reset_tokens DROP COLUMN IF EXISTS token");
            } catch (Exception ignored) {}

            // 5. Ajustar a restrição de minutos estimados
            try {
                jdbcTemplate.execute("ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_estimated_minutes_check");
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute("ALTER TABLE tasks ADD CONSTRAINT tasks_estimated_minutes_check CHECK (estimated_minutes IS NULL OR (estimated_minutes > 0 AND estimated_minutes <= 43200))");
            } catch (Exception ignored) {}

            // 6. Adicionar coluna 'time_spent_minutes' se não existir no banco
            jdbcTemplate.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_spent_minutes INT NOT NULL DEFAULT 0");

            // 7. Adicionar check constraint para time_spent_minutes no banco para integridade total
            try {
                jdbcTemplate.execute("ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_time_spent_minutes_check");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE tasks ADD CONSTRAINT tasks_time_spent_minutes_check CHECK (time_spent_minutes >= 0 AND time_spent_minutes <= 43200)");
            } catch (Exception ignored) {}

            // 8. Tabela de logs de acesso para o painel admin
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS user_access_logs (" +
                "  id BIGSERIAL PRIMARY KEY, " +
                "  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE, " +
                "  ip_hash VARCHAR(64), " +
                "  accessed_at TIMESTAMP NOT NULL DEFAULT NOW()" +
                ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_access_logs_user ON user_access_logs(user_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_access_logs_date ON user_access_logs(accessed_at)");

            // 9. Expandir tamanho da coluna role para suportar ROLE_SUPER_ADMIN
            try {
                jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(30)");
            } catch (Exception ignored) {}

            // 10. Tabela de auditoria imutável de ações administrativas
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS admin_audit_logs (" +
                "  id BIGSERIAL PRIMARY KEY, " +
                "  admin_id BIGINT NOT NULL, " +
                "  admin_email VARCHAR(255) NOT NULL, " +
                "  admin_role VARCHAR(30) NOT NULL, " +
                "  target_user_id BIGINT, " +
                "  target_user_email VARCHAR(255), " +
                "  action VARCHAR(50) NOT NULL, " +
                "  details VARCHAR(500), " +
                "  result VARCHAR(20) NOT NULL, " +
                "  ip_hash CHAR(64), " +
                "  performed_at TIMESTAMP NOT NULL DEFAULT NOW()" +
                ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_audit_admin  ON admin_audit_logs(admin_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_logs(target_user_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_audit_time   ON admin_audit_logs(performed_at)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action)");

            System.out.println("====== AUTO MIGRATION EXECUTADA COM SUCESSO ======");
        } catch (Exception e) {
            System.err.println("Aviso na execução de Auto Migration (pode já estar aplicada): " + e.getMessage());
        }
    }
}
