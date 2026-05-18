package com.taskmanager.service;

import com.taskmanager.dto.AdminUserResponse;
import com.taskmanager.entity.User;
import com.taskmanager.entity.UserRole;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    private User getCurrentAdmin() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Administrador não encontrado"));
    }

    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> {
                    long taskCount = taskRepository.countByUserId(user.getId());
                    return AdminUserResponse.fromEntity(user, taskCount);
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

        // Se o usuário a ser deletado também for um admin, verificar se o admin atual tem permissão
        // ou bloquear exclusão de outros admins por padrão para segurança extra
        if (userToDelete.getRole() == UserRole.ROLE_ADMIN) {
            throw new IllegalArgumentException("Não é permitido excluir outros administradores");
        }

        userRepository.delete(userToDelete);
    }

    public Map<String, Object> getSystemStats() {
        long totalUsers = userRepository.count();
        long totalTasks = taskRepository.count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("totalTasks", totalTasks);
        return stats;
    }
}
