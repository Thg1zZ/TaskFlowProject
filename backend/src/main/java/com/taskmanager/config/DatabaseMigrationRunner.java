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

            System.out.println("====== AUTO MIGRATION EXECUTADA COM SUCESSO ======");
        } catch (Exception e) {
            System.err.println("Aviso na execução de Auto Migration (pode já estar aplicada): " + e.getMessage());
        }
    }
}
