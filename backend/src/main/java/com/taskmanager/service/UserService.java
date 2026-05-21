package com.taskmanager.service;

import com.taskmanager.dto.ChangePasswordRequest;
import com.taskmanager.dto.UserProfileRequest;
import com.taskmanager.dto.UserProfileResponse;
import com.taskmanager.entity.Task;
import com.taskmanager.entity.User;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class UserService {

    @Autowired private UserRepository userRepo;
    @Autowired private TaskRepository taskRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private HttpServletRequest httpServletRequest;
    @Autowired private SecurityService securityService;

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
        profile.setStats(stats);

        return profile;
    }

    @Transactional
    public UserProfileResponse updateProfile(UserProfileRequest req) {
        User u = securityService.getCurrentUser();
        u.setName(req.getName().trim());
        u.setBio(req.getBio() != null ? req.getBio().trim() : null);
        u.setJobTitle(req.getJobTitle() != null ? req.getJobTitle().trim() : null);
        u.setProfileImage(req.getProfileImage() != null && !req.getProfileImage().isBlank()
                ? req.getProfileImage()
                : null);
        userRepo.save(u);

        return getProfile();
    }

    @Transactional
    public Map<String, String> changePassword(ChangePasswordRequest req) {
        User u = securityService.getCurrentUser();

        if (!passwordEncoder.matches(req.getCurrentPassword(), u.getPassword())) {
            throw new IllegalArgumentException("Senha atual incorreta");
        }
        if (req.getCurrentPassword().equals(req.getNewPassword())) {
            throw new IllegalArgumentException("A nova senha deve ser diferente da atual");
        }

        u.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepo.save(u);

        // [ASVS 3.3.1] Revogar o token atual para forçar novo login com nova senha.
        // Tokens anteriores emitidos para este usuário ficam inválidos a partir deste ponto.
        revokeCurrentToken();

        return Map.of("message", "Senha alterada com sucesso. Faça login novamente.");
    }

    /**
     * Extrai e revoga o JWT da requisição atual.
     * Isso garante que um atacante com token capturado perca acesso
     * imediatamente após a vítima trocar a senha.
     */
    private void revokeCurrentToken() {
        String bearerToken = httpServletRequest.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            String token = bearerToken.substring(7);
            jwtTokenProvider.revokeToken(token);
        }
    }

    @Transactional
    public UserProfileResponse uploadAvatar(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("O arquivo de imagem não pode estar vazio.");
        }

        // Validação de Tamanho (Max 5MB) -> Já coberto parcialmente pelo Spring, mas reforçamos
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("A imagem não pode ultrapassar 5MB.");
        }

        // Validação de Mime Type
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/jpg"))) {
            throw new IllegalArgumentException("Formato de imagem inválido. Apenas JPG/JPEG são permitidos.");
        }

        try {
            User u = securityService.getCurrentUser();
            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
            String dataUri = "data:" + contentType + ";base64," + base64Image;
            
            u.setProfileImage(dataUri);
            userRepo.save(u);
            
            return getProfile();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao processar o upload da imagem.", e);
        }
    }
}
