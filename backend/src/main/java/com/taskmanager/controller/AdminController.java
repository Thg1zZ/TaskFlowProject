package com.taskmanager.controller;

import com.taskmanager.dto.AdminChangeEmailRequest;
import com.taskmanager.dto.AdminChangeRoleRequest;
import com.taskmanager.dto.AdminUserResponse;
import com.taskmanager.entity.AdminAuditLog;
import com.taskmanager.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * [ASVS 4.1 / OWASP A01] AdminController — Controlador de administração.
 *
 * CAMADAS DE SEGURANÇA APLICADAS NESTE CONTROLLER:
 *
 * CAMADA 1 — JWT Filter: Requisições sem token JWT válido são bloqueadas antes
 *            de chegar aqui (401 Unauthorized).
 *
 * CAMADA 2 — SecurityConfig: hasAnyRole(ADMIN, SUPER_ADMIN) bloqueia qualquer
 *            usuário com ROLE_USER no filtro HTTP (403 Forbidden).
 *
 * CAMADA 3 — @PreAuthorize (ESTA CLASSE): Defense in depth. Mesmo que as camadas
 *            1 e 2 sejam contornadas (ex: misconfiguration futura), cada método
 *            verifica individualmente a role antes de executar.
 *            NOTA: hasAnyRole() usa o prefixo ROLE_ automaticamente do Spring Security.
 *
 * CAMADA 4 — AdminService: Validações de negócio (SUPER_ADMIN shield, IDOR,
 *            auto-proteção) + auditoria persistente de TODA ação.
 *
 * REGRA ZERO: O frontend NUNCA é fonte de verdade sobre permissões.
 *             Todo controle de acesso está no backend.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")  // Proteção de classe — todos os métodos herdam
public class AdminController {

    @Autowired
    private AdminService adminService;

    /**
     * Lista todos os usuários cadastrados.
     * Retorna apenas dados não-sensíveis (sem senha, sem tokens).
     */
    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")  // Redundante mas explícito (defense in depth)
    public ResponseEntity<List<AdminUserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    /**
     * Exclui permanentemente um usuário.
     * Proibido: excluir SUPER_ADMIN, excluir a si mesmo, excluir outro ADMIN.
     * [ASVS 4.1.3] Verificação de autorização na camada de serviço.
     */
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Estatísticas globais da plataforma.
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    /**
     * Altera o e-mail de um usuário.
     * [ASVS 5.1.3] @Valid valida o formato do e-mail antes de entrar no service.
     * O service revalida independentemente (zero trust do DTO).
     */
    @PatchMapping("/users/{id}/email")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<AdminUserResponse> changeUserEmail(
            @PathVariable Long id,
            @Valid @RequestBody AdminChangeEmailRequest request) {
        return ResponseEntity.ok(adminService.changeUserEmail(id, request.getEmail()));
    }

    /**
     * Altera a role de um usuário.
     * SUPER_ADMIN não pode ser rebaixado nem por outro ADMIN.
     * Apenas SUPER_ADMIN pode promover outros a SUPER_ADMIN.
     */
    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<AdminUserResponse> changeUserRole(
            @PathVariable Long id,
            @Valid @RequestBody AdminChangeRoleRequest request) {
        return ResponseEntity.ok(adminService.changeUserRole(id, request.getRole()));
    }

    /**
     * Retorna o log de auditoria paginado (50 entradas por página).
     * Todas as ações administrativas — incluindo as bloqueadas — são registradas aqui.
     * [ASVS 7.2.1] Rastreabilidade completa de ações privilegiadas.
     */
    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<AdminAuditLog>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(adminService.getAuditLogs(page));
    }
}
