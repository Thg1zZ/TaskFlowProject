package com.taskmanager.service;

import com.taskmanager.dto.ChangePasswordRequest;
import com.taskmanager.dto.UserProfileRequest;
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

import java.util.HashMap;
import java.util.Map;

@Service
public class UserService {

    @Autowired private UserRepository userRepo;
    @Autowired private TaskRepository taskRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private HttpServletRequest httpServletRequest;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }

    public Map<String, Object> getProfile() {
        User u = getCurrentUser();

        long total      = taskRepo.countByUserId(u.getId());
        long done       = taskRepo.countByUserIdAndStatus(u.getId(), Task.TaskStatus.DONE);
        long inProgress = taskRepo.countByUserIdAndStatus(u.getId(), Task.TaskStatus.IN_PROGRESS);
        long todo       = taskRepo.countByUserIdAndStatus(u.getId(), Task.TaskStatus.TODO);
        long rate       = total > 0 ? (done * 100 / total) : 0;

        Map<String, Long> stats = new HashMap<>();
        stats.put("total",          total);
        stats.put("done",           done);
        stats.put("inProgress",     inProgress);
        stats.put("todo",           todo);
        stats.put("completionRate", rate);

        Map<String, Object> profile = new HashMap<>();
        profile.put("id",        u.getId());
        profile.put("name",      u.getName());
        profile.put("email",     u.getEmail());
        profile.put("bio",       u.getBio());
        profile.put("jobTitle",  u.getJobTitle());
        profile.put("profileImage", u.getProfileImage());
        profile.put("createdAt", u.getCreatedAt());
        profile.put("role",      u.getRole().name());
        profile.put("stats",     stats);

        return profile;
    }

    @Transactional
    public Map<String, Object> updateProfile(UserProfileRequest req) {
        User u = getCurrentUser();
        u.setName(req.getName().trim());
        u.setBio(req.getBio() != null ? req.getBio().trim() : null);
        u.setJobTitle(req.getJobTitle() != null ? req.getJobTitle().trim() : null);
        u.setProfileImage(req.getProfileImage() != null && !req.getProfileImage().isBlank()
                ? req.getProfileImage()
                : null);
        userRepo.save(u);

        Map<String, Object> res = new HashMap<>();
        res.put("id",       u.getId());
        res.put("name",     u.getName());
        res.put("email",    u.getEmail());
        res.put("bio",      u.getBio());
        res.put("jobTitle", u.getJobTitle());
        res.put("profileImage", u.getProfileImage());
        res.put("role",         u.getRole().name());
        res.put("message",  "Perfil atualizado com sucesso");
        return res;
    }

    @Transactional
    public Map<String, String> changePassword(ChangePasswordRequest req) {
        User u = getCurrentUser();

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
}
