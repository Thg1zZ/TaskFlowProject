package com.taskmanager.service;

import com.taskmanager.dto.ChangePasswordRequest;
import com.taskmanager.dto.UserProfileRequest;
import com.taskmanager.dto.UserProfileResponse;
import com.taskmanager.entity.Task;
import com.taskmanager.entity.User;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.taskmanager.dto.DeleteAccountRequest;
import com.taskmanager.entity.BlacklistedEmail;
import com.taskmanager.repository.BlacklistedEmailRepository;
import com.taskmanager.util.HashUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;

import javax.imageio.ImageIO;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired private UserRepository userRepo;
    @Autowired private TaskRepository taskRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private HttpServletRequest httpServletRequest;
    @Autowired private SecurityService securityService;
    @Autowired private BlacklistedEmailRepository blacklistedEmailRepository;

    public UserProfileResponse getProfile() {
        User u = securityService.getCurrentUser();

        long total      = taskRepo.countByUserId(u.getId());
        long done       = taskRepo.countByUserIdAndStatus(u.getId(), Task.TaskStatus.DONE);
        long inProgress = taskRepo.countByUserIdAndStatus(u.getId(), Task.TaskStatus.IN_PROGRESS);
        long todo       = taskRepo.countByUserIdAndStatus(u.getId(), Task.TaskStatus.TODO);
        long rate       = total > 0 ? (done * 100 / total) : 0;

        UserProfileResponse.UserStatsDTO stats = new UserProfileResponse.UserStatsDTO(total, done, inProgress, todo, rate);

        UserProfileResponse profile = new UserProfileResponse();
        profile.setId(u.getId());
        profile.setName(u.getName());
        profile.setEmail(u.getEmail());
        profile.setBio(u.getBio());
        profile.setJobTitle(u.getJobTitle());
        profile.setProfileImage(u.getProfileImage());
        profile.setCreatedAt(u.getCreatedAt());
        profile.setRole(u.getRole().name());
        profile.setHasCompletedOnboarding(u.getHasCompletedOnboarding());
        profile.setReceiveNotifications(u.getReceiveNotifications());
        profile.setThemePreferences(u.getThemePreferences());
        profile.setStats(stats);

        return profile;
    }

    private static String blankToNull(String value) {
        return value.isBlank() ? null : value.trim();
    }

    @Transactional
    public UserProfileResponse updateProfile(UserProfileRequest req) {
        User u = securityService.getCurrentUser();
        // Campo ausente (null) = não alterar; string vazia = limpar
        u.setName(req.getName().trim());
        if (req.getBio() != null) {
            u.setBio(blankToNull(req.getBio()));
        }
        if (req.getJobTitle() != null) {
            u.setJobTitle(blankToNull(req.getJobTitle()));
        }
        if (req.getReceiveNotifications() != null) {
            u.setReceiveNotifications(req.getReceiveNotifications());
        }
        if (req.getProfileImage() != null) {
            u.setProfileImage(blankToNull(req.getProfileImage()));
        }
        userRepo.save(u);

        return getProfile();
    }

    @Transactional
    public Map<String, String> changePassword(ChangePasswordRequest req) {
        User u = securityService.getCurrentUser();

        if (!passwordEncoder.matches(req.getCurrentPassword(), u.getPassword())) {
            throw new IllegalArgumentException("error.password.currentIncorrect");
        }
        if (req.getCurrentPassword().equals(req.getNewPassword())) {
            throw new IllegalArgumentException("error.password.sameAsCurrent");
        }

        u.changePassword(passwordEncoder.encode(req.getNewPassword()));
        userRepo.save(u);

        // [ASVS 3.3.1] Revogar o token atual para forçar novo login com nova senha.
        // Tokens anteriores emitidos para este usuário ficam inválidos a partir deste ponto.
        revokeCurrentToken();

        return Map.of("message", "Senha alterada com sucesso. Faça login novamente.");
    }

    /**
     * [DUP-01 FIX] Extrai e revoga o JWT da requisição atual.
     *
     * ANTES: duplicava a lógica de "cookie → header Authorization" que já existe em
     * JwtTokenProvider.extractTokenFromRequest(). Qualquer mudança nessa lógica
     * precisava ser replicada em 3 lugares.
     *
     * AGORA: delega para o método centralizado no JwtTokenProvider.
     */
    private void revokeCurrentToken() {
        String token = jwtTokenProvider.extractTokenFromRequest(httpServletRequest);
        if (token != null && !token.isBlank()) {
            jwtTokenProvider.revokeToken(token);
        }
    }

    @Transactional
    public UserProfileResponse uploadAvatar(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("error.avatar.empty");
        }

        // 1. Validação do Header MIME (não confiamos apenas nisso)
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/webp"))) {
            throw new IllegalArgumentException("error.avatar.unsupportedFormat");
        }

        try {
            // 2. Leitura Segura via ImageIO (validação de Magic Bytes e estrutura)
            // [REF-06] Importações de AWT/ImageIO movidas para o topo do arquivo
            BufferedImage originalImage = ImageIO.read(file.getInputStream());
            if (originalImage == null) {
                throw new IllegalArgumentException("error.avatar.invalid");
            }

            int targetWidth  = Math.min(originalImage.getWidth(), 512);
            int targetHeight = Math.min(originalImage.getHeight(), 512);

            BufferedImage sanitizedImage = new BufferedImage(
                    targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);

            Graphics2D g2d = sanitizedImage.createGraphics();
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, targetWidth, targetHeight);
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                                 RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.drawImage(originalImage, 0, 0, targetWidth, targetHeight, null);
            g2d.dispose();

            // 4. Compressão controlada para JPEG
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(sanitizedImage, "jpg", baos);
            byte[] imageBytes = baos.toByteArray();

            if (imageBytes.length > 500 * 1024) {
                throw new IllegalArgumentException("error.avatar.tooLarge");
            }

            // 5. Salvar como Base64 Data URI (Seguro contra Path Traversal)
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            String dataUri = "data:image/jpeg;base64," + base64Image;
            
            User u = securityService.getCurrentUser();
            u.setProfileImage(dataUri);
            userRepo.save(u);
            
            return getProfile();
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao processar o upload da imagem.", e);
        }
    }

    @Transactional
    public void deleteAccount(DeleteAccountRequest req) {
        User u = securityService.getCurrentUser();

        // [SUPER_ADMIN SHIELD] A conta master não pode ser auto-excluída pelo sistema
        if (u.getRole() == com.taskmanager.entity.UserRole.ROLE_SUPER_ADMIN) {
            throw new IllegalArgumentException("error.account.superAdminCannotDelete");
        }

        // 1. Validar a senha fornecida
        if (!passwordEncoder.matches(req.getPassword(), u.getPassword())) {
            logger.warn("Tentativa de exclusão de conta falhou para o usuário ID {}: senha incorreta", u.getId());
            throw new IllegalArgumentException("error.password.currentIncorrect");
        }

        // [LGPD] Logs só com o ID: o e-mail não deve sobreviver à exclusão da conta
        logger.info("Iniciando exclusão da conta do usuário ID: {}", u.getId());

        // 2. Adicionar o hash do e-mail na blacklist de contas excluídas
        BlacklistedEmail blacklisted = BlacklistedEmail.builder()
                .emailHash(HashUtils.emailHash(u.getEmail()))
                .deletedAt(LocalDateTime.now())
                .reason("Conta excluída pelo próprio usuário")
                .build();
        blacklistedEmailRepository.save(blacklisted);

        // 3. Revogar o token atual
        revokeCurrentToken();

        // 4. Excluir o usuário e cascade limpar dados relacionados
        userRepo.delete(u);

        // 5. Invalidar o contexto de segurança local
        SecurityContextHolder.clearContext();

        logger.info("Conta do usuário ID {} excluída com sucesso.", u.getId());
    }

    @Transactional
    public UserProfileResponse completeOnboarding() {
        User u = securityService.getCurrentUser();
        u.setHasCompletedOnboarding(true);
        userRepo.save(u);
        return getProfile();
    }

    @Transactional
    public void updateThemePreferences(String themePreferences) {
        User u = securityService.getCurrentUser();
        u.setThemePreferences(themePreferences);
        userRepo.save(u);
    }
}
