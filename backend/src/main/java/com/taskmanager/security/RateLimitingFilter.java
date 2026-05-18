package com.taskmanager.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiting por IP para endpoints de autenticação.
 *
 * OWASP: A01 (Broken Access Control), A07 (Identification and Authentication Failures)
 * ASVS: 2.2.1 — Verifica que controles anti-automação estejam presentes.
 *
 * Endpoints cobertos:
 *  - /api/auth/login          → máx 10 tentativas / 15 minutos por IP
 *  - /api/auth/register       → máx 5 tentativas / hora por IP
 *  - /api/auth/forgot-password → máx 3 tentativas / hora por IP [VULN-05 FIX]
 *
 * [VULN-01 FIX] X-Forwarded-For só é lido se a requisição vier de um proxy confiável.
 * Proxies confiáveis são configurados via app.security.trusted-proxies em
 * application.properties. Sem proxy confiável, usa-se sempre remoteAddr.
 *
 * NOTA PRODUÇÃO: Para múltiplas instâncias (cluster), substitua ConcurrentHashMap
 * por Redis + Bucket4j ou Spring Cloud Gateway RateLimiter.
 */
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    private static final int  LOGIN_MAX_ATTEMPTS         = 10;
    private static final long LOGIN_WINDOW_MS            = 15 * 60 * 1000L;  // 15 min
    private static final int  REGISTER_MAX_ATTEMPTS      = 5;
    private static final long REGISTER_WINDOW_MS         = 60 * 60 * 1000L;  // 1 hora
    private static final int  FORGOT_PWD_MAX_ATTEMPTS    = 3;                 // [VULN-05 FIX]
    private static final long FORGOT_PWD_WINDOW_MS       = 60 * 60 * 1000L;  // 1 hora

    /** [VULN-01 FIX] IPs de proxies reversos confiáveis (ex: nginx, load balancer). */
    @Value("${app.security.trusted-proxies:}")
    private String trustedProxiesRaw;

    private List<String> trustedProxies;

    @Override
    protected void initFilterBean() {
        // Inicializa a lista de proxies confiáveis uma única vez
        if (trustedProxiesRaw != null && !trustedProxiesRaw.isBlank()) {
            trustedProxies = Arrays.stream(trustedProxiesRaw.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .toList();
        } else {
            trustedProxies = List.of();
        }
        log.info("RateLimitingFilter inicializado. Proxies confiáveis: {}",
                trustedProxies.isEmpty() ? "nenhum" : trustedProxies);
    }

    private record BucketEntry(AtomicInteger count, long windowStart) {}

    private final ConcurrentHashMap<String, BucketEntry> loginBuckets      = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, BucketEntry> registerBuckets   = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, BucketEntry> forgotPwdBuckets  = new ConcurrentHashMap<>();

    private static final Map<String, long[]> PATH_LIMITS = Map.of(
        "/api/auth/login",           new long[]{ LOGIN_MAX_ATTEMPTS,      LOGIN_WINDOW_MS      },
        "/api/auth/register",        new long[]{ REGISTER_MAX_ATTEMPTS,   REGISTER_WINDOW_MS   },
        "/api/auth/forgot-password", new long[]{ FORGOT_PWD_MAX_ATTEMPTS, FORGOT_PWD_WINDOW_MS }
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !PATH_LIMITS.containsKey(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String ip   = extractClientIp(request);
        String path = request.getRequestURI();

        long[] limits   = PATH_LIMITS.get(path);
        int  maxAttempts = (int) limits[0];
        long windowMs    = limits[1];
        var  buckets     = getBucketsForPath(path);

        if (isRateLimited(ip, buckets, maxAttempts, windowMs)) {
            log.warn("Rate limit atingido para IP={} em path={}", maskIp(ip), path);
            sendTooManyRequests(response, windowMs);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private ConcurrentHashMap<String, BucketEntry> getBucketsForPath(String path) {
        return switch (path) {
            case "/api/auth/login"           -> loginBuckets;
            case "/api/auth/register"        -> registerBuckets;
            case "/api/auth/forgot-password" -> forgotPwdBuckets;
            default                          -> loginBuckets;
        };
    }

    private boolean isRateLimited(String ip,
                                   ConcurrentHashMap<String, BucketEntry> buckets,
                                   int maxAttempts,
                                   long windowMs) {
        long now = Instant.now().toEpochMilli();

        BucketEntry entry = buckets.compute(ip, (k, existing) -> {
            if (existing == null || (now - existing.windowStart()) >= windowMs) {
                // [VULN-02-PARTIAL] Ao resetar janela, remove entrada expirada
                // (limpeza lazy — evita acúmulo de entradas mortas na memória)
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
     * [VULN-01 FIX] Extrai o IP real do cliente de forma segura.
     *
     * X-Forwarded-For só é confiado quando o remoteAddr é um proxy explicitamente
     * configurado em app.security.trusted-proxies. Caso contrário, usa remoteAddr
     * diretamente — impedindo que o cliente injete um IP falso no header e bypass
     * o rate limiter.
     *
     * OWASP ASVS 14.4 / CWE-348 (Use of Less Trusted Source)
     */
    private String extractClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();

        if (!trustedProxies.isEmpty() && trustedProxies.contains(remoteAddr)) {
            // Proxy confiável: aceitar X-Forwarded-For
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        // Sem proxy confiável: usar sempre o IP real da conexão TCP
        return remoteAddr;
    }

    /** Mascara o IP para logs — LGPD / ASVS 7.1.1 */
    private String maskIp(String ip) {
        if (ip == null) return "unknown";
        int lastDot = ip.lastIndexOf('.');
        if (lastDot > 0) return ip.substring(0, lastDot) + ".***";
        int lastColon = ip.lastIndexOf(':');
        if (lastColon > 0) return ip.substring(0, lastColon) + ":****";
        return "***";
    }
}
