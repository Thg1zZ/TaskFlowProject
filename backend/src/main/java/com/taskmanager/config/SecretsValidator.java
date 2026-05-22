package com.taskmanager.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;

/**
 * [ASVS 12 / SEC-CHECK] Validador obrigatório de segredos na inicialização.
 * Evita que a aplicação suba com configurações inseguras ou ausentes em produção.
 */
@Configuration
public class SecretsValidator implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger log = LoggerFactory.getLogger(SecretsValidator.class);

    @Value("${app.jwt.secret:#{null}}")
    private String jwtSecret;

    @Value("${spring.datasource.password:#{null}}")
    private String dbPassword;

    @Autowired
    private Environment environment;

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        // Verifica se o profile ativo é produção (ou se não for local/default)
        boolean isProduction = false;
        for (String profile : environment.getActiveProfiles()) {
            if ("prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile)) {
                isProduction = true;
                break;
            }
        }

        List<String> missing = new ArrayList<>();

        // JWT Secret validação estrita (mínimo 256 bits = 32 bytes)
        if (jwtSecret == null || jwtSecret.isBlank() || jwtSecret.equals("${JWT_SECRET}")) {
            missing.add("JWT_SECRET");
        } else if (jwtSecret.length() < 32) {
            missing.add("JWT_SECRET (deve ter pelo menos 32 caracteres)");
        }

        // DB Password validação obrigatória
        if (dbPassword == null || dbPassword.isBlank() || dbPassword.equals("${DB_PASSWORD}")) {
            // Em produção a senha do banco é estritamente obrigatória
            if (isProduction) {
                missing.add("DB_PASSWORD");
            } else {
                log.warn("[⚠️ WARNING] DB_PASSWORD não está configurado. Apenas aceitável em ambiente de desenvolvimento local.");
            }
        }

        if (!missing.isEmpty()) {
            log.error("[❌ STARTUP FAILED] Segredos obrigatórios ausentes ou inseguros: {}", missing);
            throw new IllegalStateException(
                "STARTUP FAILED — Missing or insecure required secrets: " + missing
            );
        }

        log.info("[🛡️ SECURITY] Validação de segredos de inicialização concluída com sucesso.");
    }
}
