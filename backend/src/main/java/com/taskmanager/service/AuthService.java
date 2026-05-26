package com.taskmanager.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.taskmanager.dto.AuthResponse;
import com.taskmanager.dto.LoginRequest;
import com.taskmanager.dto.RegisterRequest;
import com.taskmanager.entity.PasswordResetToken;
import com.taskmanager.entity.User;
import com.taskmanager.entity.UserAccessLog;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.PasswordResetTokenRepository;
import com.taskmanager.repository.UserAccessLogRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.repository.BlacklistedEmailRepository;
import com.taskmanager.security.JwtTokenProvider;
import com.taskmanager.util.HashUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;

/**
 * Serviço de autenticação e gerenciamento de sessão.
 *
 * CORREÇÕES APLICADAS:
 *  [REF-04] Importações do Google movidas para o topo (sem FQNs dentro dos métodos).
 *  [REF-07] System.err.println substituído por Logger SLF4J em recordAccessLog().
 *  [DUP-02] hashToken() removido — substituído por HashUtils.sha256Hex() (utilitário centralizado).
 *  [SEC-01] recordAccessLog() corrigido para usar HashUtils.hashClientIp() com validação de proxy,
 *           eliminando o risco de IP spoofing via X-Forwarded-For não validado.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider tokenProvider;
    @Autowired private DefaultCategorySeeder defaultCategorySeeder;
    @Autowired private PasswordResetTokenRepository tokenRepository;
    @Autowired private EmailService emailService;
    @Autowired private BlacklistedEmailRepository blacklistedEmailRepository;
    @Autowired private UserAccessLogRepository accessLogRepository;
    @Autowired private HashUtils hashUtils;  // [DUP-02 / SEC-01]

    @Value("${app.frontend.url}")
    private String frontendUrl;

    /**
     * [ASVS 2.5.3] Expiração configurável via variável de ambiente.
     * Padrão: 1 hora. Em produção, considere 15-30 minutos.
     */
    @Value("${app.password-reset.expiry-hours:1}")
    private int passwordResetExpiryHours;

    @Value("${app.google.client-id}")
    private String googleClientId;

    /** [ASVS 6.3.1] SecureRandom para geração de tokens criptograficamente seguros */
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String emailNormalized = request.getEmail().toLowerCase().trim();

        // 1. Verificar se o e-mail está na blacklist de contas excluídas
        if (blacklistedEmailRepository.existsByEmailIgnoreCase(emailNormalized)) {
            throw new IllegalArgumentException("Não foi possível criar a conta com os dados informados");
        }

        // 2. Evitar revelação se o e-mail já existe (User Enumeration)
        if (userRepository.existsByEmailIgnoreCase(emailNormalized)) {
            throw new IllegalArgumentException("Não foi possível criar a conta com os dados informados");
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(emailNormalized)
                .password(passwordEncoder.encode(request.getPassword()))
                .acceptedTerms(true)
                .acceptedAt(LocalDateTime.now())
                .termsVersion("1.0")
                .build();

        User saved = userRepository.save(user);
        defaultCategorySeeder.seedForNewUser(saved);
        String token = tokenProvider.generateToken(saved.getEmail());
        return new AuthResponse(token, saved.getId(), saved.getName(), saved.getEmail(), saved.getRole(), saved.getHasCompletedOnboarding(), saved.getReceiveNotifications(), saved.getThemePreferences());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail().toLowerCase().trim(),
                        request.getPassword()
                )
        );

        String token = tokenProvider.generateToken(authentication);

        User user = userRepository.findByEmailIgnoreCase(request.getEmail().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        // [LGPD] Registra acesso com hash do IP — IP real nunca é persistido
        recordAccessLog(user);

        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getHasCompletedOnboarding(), user.getReceiveNotifications(), user.getThemePreferences());
    }

    public void logout(String token) {
        tokenProvider.revokeToken(token);
    }

    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmailIgnoreCase(email.trim()).ifPresent(user -> {
            tokenRepository.deleteByUser(user);

            // [ASVS 6.3.1] Token criptograficamente seguro (256 bits)
            byte[] randomBytes = new byte[32];
            SECURE_RANDOM.nextBytes(randomBytes);
            String tokenPlain = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

            // [VULN-07 FIX / DUP-02] Salvar apenas o hash SHA-256 via HashUtils.sha256Hex()
            // Token plain-text nunca é persistido no banco — ASVS 2.5.4 / CWE-312
            String tokenHash = HashUtils.sha256Hex(tokenPlain);

            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .tokenHash(tokenHash)
                    .user(user)
                    .expiryDate(LocalDateTime.now().plusHours(passwordResetExpiryHours))
                    .build();
            tokenRepository.save(resetToken);

            String resetLink = frontendUrl + "/reset_password.html?token=" + tokenPlain;
            emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        // [VULN-07 FIX / DUP-02] Hashear o token recebido via HashUtils antes de buscar no banco
        String tokenHash = HashUtils.sha256Hex(token);
        PasswordResetToken resetToken = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Token inválido"));

        if (resetToken.isExpired()) {
            tokenRepository.delete(resetToken);
            throw new IllegalArgumentException("Token expirado");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // [ASVS 3.3.1] Consumir o token de reset imediatamente (one-time use)
        tokenRepository.delete(resetToken);
    }

    /**
     * [LGPD / SEC-01 FIX] Registra log de acesso com hash do IP validado.
     *
     * ANTES: lia X-Forwarded-For diretamente sem verificar proxy — qualquer cliente
     * poderia injetar um IP falso e corromper o audit log (CWE-348).
     *
     * AGORA: usa HashUtils.hashClientIp() que valida o proxy antes de aceitar o header.
     *
     * [REF-07 FIX] Substituído System.err.println por log.warn() (SLF4J/Logback).
     */
    private void recordAccessLog(User user) {
        try {
            String ipHash = null;
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                // [SEC-01] hashClientIp valida proxy antes de usar X-Forwarded-For
                ipHash = hashUtils.hashClientIp(attrs.getRequest());
            }
            UserAccessLog accessLog = UserAccessLog.builder()
                    .user(user)
                    .ipHash(ipHash)
                    .build();
            accessLogRepository.save(accessLog);
        } catch (Exception e) {
            // [REF-07] Logger SLF4J em vez de System.err.println
            log.warn("[ACCESS-LOG] Falha ao registrar access log para usuário {}: {}",
                user.getEmail(), e.getMessage());
        }
    }

    @Transactional
    public AuthResponse loginWithGoogle(String idTokenString, String suppliedNonce) {
        try {
            GoogleIdToken.Payload payload = verifyGoogleToken(idTokenString);

            // 1. Exigir verificação estrita de e-mail (ASVS 2.1.12)
            if (!payload.getEmailVerified()) {
                throw new IllegalArgumentException("Email do Google não verificado");
            }

            // 2. Proteção contra CSRF e Replays — Validação estrita de Nonce
            String tokenNonce = (String) payload.get("nonce");
            if (tokenNonce == null || tokenNonce.isBlank() || !tokenNonce.equals(suppliedNonce)) {
                throw new IllegalArgumentException("Token de estado (Nonce/CSRF) inválido ou expirado");
            }

            User user = syncSocialUser(payload);

            // [LGPD] Registra acesso via Google OAuth
            recordAccessLog(user);

            // Gerar token nativo do TaskFlow para a sessão
            String appToken = tokenProvider.generateToken(user.getEmail());
            return new AuthResponse(appToken, user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getHasCompletedOnboarding(), user.getReceiveNotifications(), user.getThemePreferences());

        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao processar login com Google: " + e.getMessage(), e);
        }
    }

    // [REF-04] FQNs do Google movidos para imports no topo — método agora legível
    private GoogleIdToken.Payload verifyGoogleToken(String idTokenString) throws Exception {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                new GsonFactory())
            .setAudience(Collections.singletonList(googleClientId))
            .setIssuers(Arrays.asList("accounts.google.com", "https://accounts.google.com"))
            .build();

        GoogleIdToken idToken = verifier.verify(idTokenString);
        if (idToken == null) {
            throw new IllegalArgumentException("Assinatura do token do Google inválida ou expirada");
        }
        return idToken.getPayload();
    }

    private User syncSocialUser(GoogleIdToken.Payload payload) {
        String email = payload.getEmail().toLowerCase().trim();
        String name = (String) payload.get("name");
        if (name == null || name.isBlank()) {
            name = email.split("@")[0];
        }

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        boolean isNewUser = (user == null);

        if (isNewUser) {
            // [ASVS 2.4.6] Senha de alta entropia para login social (nunca exposta, impossível adivinhar)
            byte[] randomBytes = new byte[24];
            SECURE_RANDOM.nextBytes(randomBytes);
            String secureRandomPassword = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes) + "aA1!";

            user = User.builder()
                    .name(name.trim())
                    .email(email)
                    .password(passwordEncoder.encode(secureRandomPassword))
                    .role(com.taskmanager.entity.UserRole.ROLE_USER)
                    .build();

            user = userRepository.save(user);
            defaultCategorySeeder.seedForNewUser(user);
        }

        return user;
    }
}
