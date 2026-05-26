package com.taskmanager.util;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.List;

/**
 * [DUP-02 / SEC-01 / LGPD] Utilitário centralizado para hashing e extração segura de IP.
 *
 * ANTES: a lógica de SHA-256 estava duplicada em AuthService.hashToken() e
 * AdminService.hashCurrentIp(). Além disso, AuthService lia X-Forwarded-For sem
 * validar se o remetente era um proxy confiável (SEC-01 — IP spoofing no audit log).
 *
 * AGORA:
 *  - sha256Hex()     → método estático, substituiu hashToken() e o bloco de hash do AdminService
 *  - hashClientIp()  → extrai e hasheia o IP com validação de proxy, corrigindo SEC-01
 *  - extractClientIp() → extração segura usável em qualquer camada
 *
 * REFERÊNCIAS: OWASP ASVS 14.4 (CWE-348), LGPD art. 12
 */
@Component
public class HashUtils {

    private static final Logger log = LoggerFactory.getLogger(HashUtils.class);

    /** IPs de proxies reversos confiáveis (ex: nginx, load balancer no Render). */
    @Value("${app.security.trusted-proxies:}")
    private String trustedProxiesRaw;

    /** Cache lazy da lista de proxies (imutável após a primeira leitura). */
    private volatile List<String> trustedProxies;

    // ═══════════════════════════════════════════════════════════════════════
    // HASH SHA-256
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Gera o hash SHA-256 hexadecimal de qualquer String.
     *
     * USOS: tokens de reset de senha, IPs para LGPD.
     * Método estático — não requer Spring para ser chamado.
     *
     * @param input String a ser hasheada (não pode ser null)
     * @return String hexadecimal de 64 chars (SHA-256)
     * @throws IllegalStateException se SHA-256 não estiver disponível na JVM (nunca acontece)
     */
    public static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(64);
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 é garantido pela JVM spec — jamais deve ocorrer
            throw new IllegalStateException("SHA-256 não disponível na JVM", e);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXTRAÇÃO SEGURA DE IP (SEC-01 FIX)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * [SEC-01 FIX] Extrai o IP real do cliente com validação de proxy confiável.
     *
     * PROBLEMA ANTERIOR: AuthService e AdminService liam X-Forwarded-For diretamente,
     * permitindo que qualquer cliente injetasse um IP falso no header e corrompesse
     * o audit log (CWE-348 — Use of Less Trusted Source).
     *
     * REGRA: X-Forwarded-For só é aceito se o remoteAddr da conexão TCP pertence
     * à lista de proxies confiáveis configurados em app.security.trusted-proxies.
     * Caso contrário, usa-se sempre o IP da conexão TCP.
     */
    public String extractClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        List<String> proxies = getOrLoadTrustedProxies();

        if (!proxies.isEmpty() && proxies.contains(remoteAddr)) {
            // Proxy confiável confirmado — podemos ler o header
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        // Sem proxy confiável → IP da conexão TCP (sempre confiável)
        return remoteAddr;
    }

    /**
     * Extrai o IP do cliente e retorna o hash SHA-256 para persistência segura (LGPD art. 12).
     * O IP real NUNCA é armazenado — apenas o hash, que é irreversível.
     *
     * @return hash SHA-256 do IP, ou null se não for possível extrair
     */
    public String hashClientIp(HttpServletRequest request) {
        try {
            String ip = extractClientIp(request);
            return (ip != null && !ip.isBlank()) ? sha256Hex(ip) : null;
        } catch (Exception e) {
            log.debug("[HASH-IP] Falha ao extrair/hashear IP: {}", e.getMessage());
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVADO
    // ═══════════════════════════════════════════════════════════════════════

    private List<String> getOrLoadTrustedProxies() {
        if (trustedProxies == null) {
            synchronized (this) {
                if (trustedProxies == null) {
                    trustedProxies = (trustedProxiesRaw != null && !trustedProxiesRaw.isBlank())
                        ? Arrays.stream(trustedProxiesRaw.split(","))
                                .map(String::trim)
                                .filter(s -> !s.isBlank())
                                .toList()
                        : List.of();
                    log.info("[HashUtils] Proxies confiáveis carregados: {}",
                        trustedProxies.isEmpty() ? "nenhum" : trustedProxies);
                }
            }
        }
        return trustedProxies;
    }
}
