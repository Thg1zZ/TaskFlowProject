package com.taskmanager.controller;

import com.taskmanager.dto.AdminChangeEmailRequest;
import com.taskmanager.dto.AdminChangeRoleRequest;
import com.taskmanager.dto.AdminUserResponse;
import com.taskmanager.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    /** Lista todos os usuários com contagem de tarefas e acessos */
    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    /** Exclui um usuário (não pode excluir outro admin nem a si mesmo) */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    /** Estatísticas globais da plataforma */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    /**
     * Troca o e-mail de um usuário manualmente.
     * Backend valida: unicidade, blacklist e normalização.
     */
    @PatchMapping("/users/{id}/email")
    public ResponseEntity<AdminUserResponse> changeUserEmail(
            @PathVariable Long id,
            @Valid @RequestBody AdminChangeEmailRequest request) {
        return ResponseEntity.ok(adminService.changeUserEmail(id, request.getEmail()));
    }

    /**
     * Promove ou rebaixa a role de um usuário.
     * Protegido: não permite auto-alteração nem ação sobre outros admins.
     */
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<AdminUserResponse> changeUserRole(
            @PathVariable Long id,
            @Valid @RequestBody AdminChangeRoleRequest request) {
        return ResponseEntity.ok(adminService.changeUserRole(id, request.getRole()));
    }
}
