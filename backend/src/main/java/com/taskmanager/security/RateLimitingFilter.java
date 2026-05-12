package com.taskmanager.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiting por IP para endpoints de autenticação.
 *
 * OWASP: A01 (Broken Access Control), A07 (Identification and Authentication Failures)
 * ASVS: 2.2.1 — Verifica que controles anti-automação estejam presentes.
 *
 * Estratégia: sliding window simplificada.
 *  - /api/auth/login     → máx 10 tentativas / 15 minutos por IP
 *  - /api/auth/register  → máx 5 tentativas / hora por IP
 *
 * NOTA PRODUÇÃO: Para implantações com múltiplas instâncias (cluster),
 * substitua o ConcurrentHashMap por um bucket distribuído (ex: Redis +
 * Bucket4j ou Spring Cloud Gateway RateLimiter).
 */
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    // Limites configuráveis — mover para application.properties em produção
    private static final int  LOGIN_MAX_ATTEMPTS    = 10;
    private static final long LOGIN_WINDOW_MS       = 15 * 60 * 1000L;  // 15 min
    private static final int  REGISTER_MAX_ATTEMPTS = 5;
    private static final long REGISTER_WINDOW_MS    = 60 * 60 * 1000L;  // 1 hora

    private record BucketEntry(AtomicInteger count, long windowStart) {}

    private final ConcurrentHashMap<String, BucketEntry> loginBuckets    = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, BucketEntry> registerBuckets = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.equals("/api/auth/login") && !path.equals("/api/auth/register");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String ip   = extractClientIp(request);
        String path = request.getRequestURI();

        boolean isLogin    = path.equals("/api/auth/login");
        int     maxAttempts = isLogin ? LOGIN_MAX_ATTEMPTS    : REGISTER_MAX_ATTEMPTS;
        long    windowMs    = isLogin ? LOGIN_WINDOW_MS       : REGISTER_WINDOW_MS;
        var     buckets     = isLogin ? loginBuckets           : registerBuckets;

        if (isRateLimited(ip, buckets, maxAttempts, windowMs)) {
            log.warn("Rate limit atingido para IP={} em path={}", maskIp(ip), path);
            sendTooManyRequests(response, windowMs);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimited(String ip,
                                   ConcurrentHashMap<String, BucketEntry> buckets,
                                   int maxAttempts,
                                   long windowMs) {
        long now = Instant.now().toEpochMilli();

        BucketEntry entry = buckets.compute(ip, (k, existing) -> {
            if (existing == null || (now - existing.windowStart()) >= windowMs) {
                return new BucketEntry(new AtomicInteger(1), now);
            }
            existing.count().incrementAndGet();
            return existing;
        });

        return entry.count().get() > maxAttempts;
    }

    private void sendTooManyRequests(HttpServletResponse response, long windowMs) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        long retryAfterSeconds = windowMs / 1000;
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.getWriter().write(
            "{\"status\":429,\"error\":\"Muitas tentativas. Tente novamente em " +
            (retryAfterSeconds / 60) + " minuto(s).\"}"
        );
    }

    /**
     * Extrai o IP real do cliente, respeitando proxies confiáveis.
     * ATENÇÃO: Confiar em X-Forwarded-For sem validar o proxy é um vetor de spoofing.
     * Em produção, configure o Spring Boot para usar ForwardedHeaderFilter
     * ou restrinja quais proxies são confiáveis.
     */
    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // Pega apenas o primeiro IP da cadeia
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /** Mascara o IP para logs — LGPD / ASVS 7.1.1 */
    private String maskIp(String ip) {
        if (ip == null) return "unknown";
        int lastDot = ip.lastIndexOf('.');
        if (lastDot > 0) return ip.substring(0, lastDot) + ".***";
        // IPv6: mascara últimos 4 grupos
        int lastColon = ip.lastIndexOf(':');
        if (lastColon > 0) return ip.substring(0, lastColon) + ":****";
        return "***";
    }
}
