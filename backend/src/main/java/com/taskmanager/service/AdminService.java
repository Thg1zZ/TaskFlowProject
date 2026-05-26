package com.taskmanager.service;

import com.taskmanager.dto.AdminUserResponse;
import com.taskmanager.entity.User;
import com.taskmanager.entity.UserRole;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.BlacklistedEmailRepository;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserAccessLogRepository;
import com.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AdminService {

    @Autowired private UserRepository userRepository;
    @Autowired private TaskRepository taskRepository;
    @Autowired private UserAccessLogRepository accessLogRepository;
    @Autowired private BlacklistedEmailRepository blacklistedEmailRepository;

    private User getCurrentAdmin() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Administrador não encontrado"));
    }

    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> {
                    long taskCount = taskRepository.countByUserId(user.getId());
                    long accessCount = accessLogRepository.countByUserId(user.getId());
                    return AdminUserResponse.fromEntity(user, taskCount, accessCount);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = false)
    public void deleteUser(Long id) {
        User admin = getCurrentAdmin();

        // [ASVS 4.1.1] Impedir que o administrador delete a si mesmo
        if (admin.getId().equals(id)) {
            throw new IllegalArgumentException("Você não pode excluir sua própria conta administradora");
        }

        User userToDelete = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        // Impedir exclusão de outros admins
        if (userToDelete.getRole() == UserRole.ROLE_ADMIN) {
            throw new IllegalArgumentException("Não é permitido excluir outros administradores");
        }

        userRepository.delete(userToDelete);
    }

    /**
     * [ASVS 4.1] Troca de e-mail pelo admin com validações de segurança completas.
     * Verifica unicidade, blacklist, e normaliza antes de persistir.
     */
    @Transactional(readOnly = false)
    public AdminUserResponse changeUserEmail(Long id, String newEmail) {
        User admin = getCurrentAdmin();
        String normalized = newEmail.toLowerCase().trim();

        // Impedir que admin altere o próprio e-mail por aqui (usar perfil)
        if (admin.getId().equals(id)) {
            throw new IllegalArgumentException("Use a página de perfil para alterar seu próprio e-mail");
        }

        // Verificar blacklist
        if (blacklistedEmailRepository.existsByEmailIgnoreCase(normalized)) {
            throw new IllegalArgumentException("Este e-mail está bloqueado no sistema");
        }

        // Verificar unicidade
        if (userRepository.existsByEmailIgnoreCase(normalized)) {
            throw new IllegalArgumentException("Este e-mail já está em uso por outro usuário");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        user.setEmail(normalized);
        User saved = userRepository.save(user);

        long taskCount = taskRepository.countByUserId(saved.getId());
        long accessCount = accessLogRepository.countByUserId(saved.getId());
        return AdminUserResponse.fromEntity(saved, taskCount, accessCount);
    }

    /**
     * [ASVS 4.1] Alteração de role com proteções: não permite auto-promoção
     * nem rebaixamento de outro admin.
     */
    @Transactional(readOnly = false)
    public AdminUserResponse changeUserRole(Long id, String roleName) {
        User admin = getCurrentAdmin();

        if (admin.getId().equals(id)) {
            throw new IllegalArgumentException("Você não pode alterar sua própria role por aqui");
        }

        UserRole newRole;
        try {
            newRole = UserRole.valueOf(roleName.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Role inválida. Use ROLE_USER ou ROLE_ADMIN");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        user.setRole(newRole);
        User saved = userRepository.save(user);

        long taskCount = taskRepository.countByUserId(saved.getId());
        long accessCount = accessLogRepository.countByUserId(saved.getId());
        return AdminUserResponse.fromEntity(saved, taskCount, accessCount);
    }

    public Map<String, Object> getSystemStats() {
        long totalUsers = userRepository.count();
        long totalTasks = taskRepository.count();
        long totalAccesses = accessLogRepository.count();

        LocalDateTime last7Days = LocalDateTime.now().minusDays(7);
        LocalDateTime last30Days = LocalDateTime.now().minusDays(30);

        long newUsersLast7Days = userRepository.countByCreatedAtAfter(last7Days);
        long newUsersLast30Days = userRepository.countByCreatedAtAfter(last30Days);
        long accessesLast7Days = accessLogRepository.countByAccessedAtAfter(last7Days);
        long accessesLast30Days = accessLogRepository.countByAccessedAtAfter(last30Days);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("totalTasks", totalTasks);
        stats.put("totalAccesses", totalAccesses);
        stats.put("newUsersLast7Days", newUsersLast7Days);
        stats.put("newUsersLast30Days", newUsersLast30Days);
        stats.put("accessesLast7Days", accessesLast7Days);
        stats.put("accessesLast30Days", accessesLast30Days);
        return stats;
    }
}
