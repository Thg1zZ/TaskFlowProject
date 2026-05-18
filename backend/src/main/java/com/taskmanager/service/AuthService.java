package com.taskmanager.service;

import com.taskmanager.dto.AuthResponse;
import com.taskmanager.dto.LoginRequest;
import com.taskmanager.dto.RegisterRequest;
import com.taskmanager.entity.PasswordResetToken;
import com.taskmanager.entity.User;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.PasswordResetTokenRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class AuthService {

    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider tokenProvider;
    @Autowired private DefaultCategorySeeder defaultCategorySeeder;
    @Autowired private PasswordResetTokenRepository tokenRepository;
    @Autowired private EmailService emailService;

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
        // Mensagem genérica — não revelar se email já existe (user enumeration)
        if (userRepository.existsByEmailIgnoreCase(request.getEmail().trim())) {
            throw new IllegalArgumentException("Não foi possível criar a conta com os dados informados");
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        User saved = userRepository.save(user);
        defaultCategorySeeder.seedForNewUser(saved);
        String token = tokenProvider.generateToken(saved.getEmail());
        return new AuthResponse(token, saved.getId(), saved.getName(), saved.getEmail(), saved.getRole());
    }

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

        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole());
    }

    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmailIgnoreCase(email.trim()).ifPresent(user -> {
            tokenRepository.deleteByUser(user);

            // [ASVS 6.3.1] Token criptograficamente seguro (256 bits)
            byte[] randomBytes = new byte[32];
            SECURE_RANDOM.nextBytes(randomBytes);
            String tokenPlain = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

            // [VULN-07 FIX] Salvar apenas o hash SHA-256 — token plain-text nunca é persistido
            String tokenHash = hashToken(tokenPlain);

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
        // [VULN-07 FIX] Hashear o token recebido antes de buscar no banco
        String tokenHash = hashToken(token);
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
     * [VULN-07 FIX] Gera hash SHA-256 do token para armazenamento seguro.
     * ASVS 2.5.4 / CWE-312
     */
    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 não disponível", e);
        }
    }

    @Transactional
    public AuthResponse loginWithGoogle(String idTokenString, String suppliedNonce) {
        try {
            com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier verifier = 
                new com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier.Builder(
                        new com.google.api.client.http.javanet.NetHttpTransport(), 
                        new com.google.api.client.json.gson.GsonFactory())
                    .setAudience(java.util.Collections.singletonList(googleClientId))
                    .setIssuers(java.util.Arrays.asList("accounts.google.com", "https://accounts.google.com"))
                    .build();

            com.google.api.client.googleapis.auth.oauth2.GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new IllegalArgumentException("Assinatura do token do Google inválida ou expirada");
            }

            com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload payload = idToken.getPayload();
            
            // 1. Exigir verificação estrita de e-mail (ASVS 2.1.12)
            if (!payload.getEmailVerified()) {
                throw new IllegalArgumentException("Email do Google não verificado");
            }

            // 2. Proteção contra CSRF e Replays - Validação estrita de Nonce
            String tokenNonce = (String) payload.get("nonce");
            if (tokenNonce == null || tokenNonce.isBlank() || !tokenNonce.equals(suppliedNonce)) {
                throw new IllegalArgumentException("Token de estado (Nonce/CSRF) inválido ou expirado");
            }

            String email = payload.getEmail().toLowerCase().trim();
            String name = (String) payload.get("name");
            if (name == null || name.isBlank()) {
                name = email.split("@")[0];
            }

            // Buscar ou criar usuário autonomamente no Backend
            User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            boolean isNewUser = false;

            if (user == null) {
                isNewUser = true;
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
            }

            if (isNewUser) {
                defaultCategorySeeder.seedForNewUser(user);
            }

            // Gerar token nativo do TaskFlow para a sessão
            String appToken = tokenProvider.generateToken(user.getEmail());
            return new AuthResponse(appToken, user.getId(), user.getName(), user.getEmail(), user.getRole());

        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao processar login com Google: " + e.getMessage(), e);
        }
    }
}
