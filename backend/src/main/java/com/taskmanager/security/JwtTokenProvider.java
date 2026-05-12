package com.taskmanager.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.WeakKeyException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Date;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Provedor JWT com melhorias de segurança.
 *
 * OWASP A02 / ASVS 3.5:
 *  - JTI (JWT ID) em cada token — permite revogação individual
 *  - Blacklist em memória para tokens revogados (troca de senha, etc.)
 *  - Validação de tamanho mínimo da chave (256 bits / 32 bytes para HMAC-SHA256)
 *  - Algoritmo explícito no builder (não inferido)
 *
 * NOTA PRODUÇÃO: A blacklist em memória é perdida no restart e não funciona em cluster.
 * Substitua por Redis com TTL = jwtExpiration (tokens expirados saem automaticamente).
 *
 * Exemplo Redis:
 *   redisTemplate.opsForValue().set("jwt:revoked:" + jti, "1", Duration.ofMillis(jwtExpiration));
 *   boolean revoked = Boolean.TRUE.equals(redisTemplate.hasKey("jwt:revoked:" + jti));
 */
@Component
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);

    /** Tamanho mínimo da chave HMAC-SHA256: 256 bits = 32 bytes = 32 chars UTF-8 ASCII */
    private static final int MIN_SECRET_LENGTH = 32;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    /**
     * Blacklist de JTIs revogados.
     * Cada entrada tem TTL implícito = tempo de expiração do token.
     * Em produção: use Redis com TTL automático.
     */
    private final Set<String> revokedJtis = Collections.newSetFromMap(new ConcurrentHashMap<>());

    private SecretKey getSigningKey() {
        // [ASVS 6.4.1] Valida tamanho mínimo da chave antes de usar
        if (jwtSecret == null || jwtSecret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                "app.jwt.secret deve ter no mínimo " + MIN_SECRET_LENGTH +
                " caracteres (256 bits). Configure via variável de ambiente JWT_SECRET."
            );
        }
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        try {
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (WeakKeyException e) {
            throw new IllegalStateException("Chave JWT fraca: " + e.getMessage(), e);
        }
    }

    public String generateToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        return generateToken(userDetails.getUsername());
    }

    public String generateToken(String email) {
        Date now        = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);
        // [ASVS 3.5.3] JTI único por token — permite revogação individual
        String jti = UUID.randomUUID().toString();

        return Jwts.builder()
                .id(jti)                        // jti claim
                .subject(email)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey(), Jwts.SIG.HS256)  // algoritmo explícito
                .compact();
    }

    /**
     * Revoga um token pelo seu JTI.
     * Chamado ao trocar senha, logout, ou suspeita de comprometimento.
     *
     * ASVS 3.3.1 — Tokens de sessão devem ser invalidados no logout/troca de senha.
     */
    public void revokeToken(String token) {
        try {
            String jti = getJtiFromToken(token);
            if (jti != null) {
                revokedJtis.add(jti);
                logger.info("Token revogado: jti={}", jti);
            }
        } catch (Exception e) {
            logger.warn("Não foi possível revogar token: {}", e.getMessage());
        }
    }

    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public String getJtiFromToken(String token) {
        return parseClaims(token).getId();
    }

    public boolean validateToken(String token) {
        try {
            Claims claims = parseClaims(token);

            // [ASVS 3.5.3] Verifica blacklist de JTIs revogados
            String jti = claims.getId();
            if (jti != null && revokedJtis.contains(jti)) {
                logger.warn("Token com JTI revogado foi apresentado: jti={}", jti);
                return false;
            }

            return true;
        } catch (MalformedJwtException e) {
            logger.error("Token JWT malformado");
        } catch (ExpiredJwtException e) {
            logger.error("Token JWT expirado");
        } catch (UnsupportedJwtException e) {
            logger.error("Token JWT não suportado");
        } catch (IllegalArgumentException e) {
            logger.error("Claims JWT vazios");
        }
        return false;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
