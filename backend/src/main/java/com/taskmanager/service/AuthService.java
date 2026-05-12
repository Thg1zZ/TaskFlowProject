package com.taskmanager.service;

import com.taskmanager.dto.AuthResponse;
import com.taskmanager.dto.LoginRequest;
import com.taskmanager.dto.RegisterRequest;
import com.taskmanager.entity.PasswordResetToken;
import com.taskmanager.entity.User;
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
        return new AuthResponse(token, saved.getId(), saved.getName(), saved.getEmail());
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
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail());
    }

    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmailIgnoreCase(email.trim()).ifPresent(user -> {
            tokenRepository.deleteByUser(user);

            // [ASVS 6.3.1] Token criptograficamente seguro (256 bits = 32 bytes → 44 chars Base64)
            // UUID é apenas 122 bits de entropia — suficiente mas não ideal.
            // Base64(SecureRandom(32 bytes)) oferece 256 bits de entropia.
            byte[] randomBytes = new byte[32];
            SECURE_RANDOM.nextBytes(randomBytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .token(token)
                    .user(user)
                    // [ASVS 2.5.3] Expiração parametrizada via propriedade
                    .expiryDate(LocalDateTime.now().plusHours(passwordResetExpiryHours))
                    .build();
            tokenRepository.save(resetToken);

            String resetLink = frontendUrl + "/reset_password.html?token=" + token;
            emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
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

        // NOTA: Não é possível revogar JWTs existentes do usuário aqui sem conhecer
        // os tokens ativos. A blacklist por JTI na JwtTokenProvider + Redis
        // permitiria revogar todos os tokens de um userId.
        // Por ora, a expiração natural (padrão 24h) limita a janela de risco.
        // Para segurança máxima: armazene userId no JWT e invalide por userId no Redis.
    }
}
