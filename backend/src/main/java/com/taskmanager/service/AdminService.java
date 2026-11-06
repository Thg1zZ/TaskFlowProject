package com.taskmanager.service;

import com.taskmanager.dto.AdminUserResponse;
import com.taskmanager.entity.AdminAuditLog;
import com.taskmanager.entity.User;
import com.taskmanager.entity.UserRole;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.AdminAuditLogRepository;
import com.taskmanager.repository.BlacklistedEmailRepository;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserAccessLogRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.util.HashUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * [ASVS 4.1 / OWASP A01] AdminService: serviço central de administração.
 *
 * CORREÇÕES APLICADAS NESTA VERSÃO:
 *
 * [REF-01] Injeção de dependências via construtor com @RequiredArgsConstructor
 *          (facilita testes unitários com mocks).
 *
 * [DUP-03 / DUP-04] getCurrentAdmin() removido. Usamos SecurityService.getCurrentUser()
 *          que já faz exatamente a mesma coisa, eliminando o UserRepository duplicado
 *          para este propósito específico.
 *
 * [DUP-02] hashCurrentIp() removido. Substituído por HashUtils.hashClientIp()
 *          que também corrige SEC-01 (proxy validation antes de ler X-Forwarded-For).
 *
 * [REF-05] changeUserRole(): validação de input (guard clauses) movida para
 *          ANTES da auto-proteção; inputs inválidos são rejeitados primeiro.
 *
 * [SEC-03] auditFailCount: contador de falhas consecutivas de auditoria.
 *          Após 3 falhas seguidas, um alerta de nível ERROR é emitido para o
 *          sistema de monitoramento (ASVS 7.2.1: ações admin devem ser sempre auditadas).
 *
 * PRINCÍPIOS MANTIDOS:
 *  - Zero Trust: validações independem do frontend
 *  - Defense in Depth: camada de serviço valida mesmo após @PreAuthorize
 *  - Auditoria imutável: toda ação, bem-sucedida ou bloqueada, é persistida
 *  - Fail-Secure: erros bloqueiam, nunca "falham abertos"
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    // [REF-01] Injeção por construtor: @RequiredArgsConstructor gera o construtor
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final UserAccessLogRepository accessLogRepository;
    private final BlacklistedEmailRepository blacklistedEmailRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final AdminAuditService adminAuditService;
    private final SecurityService securityService;  // [DUP-03] substitui getCurrentAdmin() local
    private final HashUtils hashUtils;              // [DUP-02 / SEC-01] substitui hashCurrentIp()

    /** [SEC-03] Contador de falhas consecutivas de persistência de auditoria */
    private final AtomicInteger auditFailCount = new AtomicInteger(0);
    private static final int AUDIT_FAIL_ALERT_THRESHOLD = 3;

    // ═══════════════════════════════════════════════════════════════════════
    // MÉTODOS INTERNOS DE SUPORTE
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Ninguém modifica a conta SUPER_ADMIN, e apenas o SUPER_ADMIN modifica outros ADMINs.
     * Tentativas bloqueadas são registradas no audit log.
     */
    private void assertCanManage(User target, User admin, String action) {
        if (target.getRole() == UserRole.ROLE_SUPER_ADMIN) {
            persistAudit(admin, target, action,
                "Tentativa de modificar conta ROLE_SUPER_ADMIN bloqueada",
                AdminAuditLog.RESULT_BLOCKED);
            log.warn("[SECURITY] Tentativa de modificar SUPER_ADMIN detectada. Admin: {} | Ação: {}",
                admin.getEmail(), action);
            throw new IllegalArgumentException(
                "error.admin.protectedAccount"
            );
        }
        if (target.getRole() == UserRole.ROLE_ADMIN && admin.getRole() != UserRole.ROLE_SUPER_ADMIN) {
            persistAudit(admin, target, action,
                "Tentativa de ADMIN modificar outro ADMIN bloqueada",
                AdminAuditLog.RESULT_BLOCKED);
            log.warn("[SECURITY] ADMIN tentou modificar outro ADMIN. Admin: {} | Ação: {}",
                admin.getEmail(), action);
            throw new IllegalArgumentException(
                "error.admin.onlySuperAdminManagesAdmins"
            );
        }
    }

    /**
     * [SEC-03 / ASVS 7.2.1] Persiste um registro imutável de auditoria.
     *
     * Nunca lança exceção: a falha de auditoria NÃO impede a operação principal
     * (princípio de disponibilidade). Porém, falhas consecutivas ativam alerta de ERROR
     * para que o sistema de monitoramento possa detectar degradação do banco de auditoria.
     */
    private void persistAudit(User admin, User target, String action, String details, String result) {
        try {
            String ipHash = getRequestIpHash();
            AdminAuditLog entry = AdminAuditLog.builder()
                    .adminId(admin.getId())
                    .adminEmail(admin.getEmail())
                    .adminRole(admin.getRole().name())
                    .targetUserId(target != null ? target.getId() : null)
                    .targetUserEmail(target != null ? target.getEmail() : null)
                    .action(action)
                    .details(details)
                    .result(result)
                    .ipHash(ipHash)
                    .build();
            adminAuditService.saveAuditLog(entry);
            auditFailCount.set(0); // Reset do contador em caso de sucesso
        } catch (Exception e) {
            int fails = auditFailCount.incrementAndGet();
            if (fails >= AUDIT_FAIL_ALERT_THRESHOLD) {
                // [SEC-03] Alerta crítico: audit log está degradado
                log.error("[SECURITY ALERT] Audit log falhou {} vezes consecutivas. " +
                    "Ações admin podem não estar sendo auditadas! Action={}, Admin={}: {}",
                    fails, action, admin.getEmail(), e.getMessage());
            } else {
                log.error("[AUDIT] Falha ao persistir log de auditoria. Action={}, Admin={}: {}",
                    action, admin.getEmail(), e.getMessage());
            }
        }
    }

    /**
     * [DUP-02 / SEC-01] Obtém o hash SHA-256 do IP da requisição atual.
     * Usa HashUtils.hashClientIp() que valida o proxy antes de ler X-Forwarded-For.
     */
    private String getRequestIpHash() {
        try {
            ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            HttpServletRequest req = attrs.getRequest();
            return hashUtils.hashClientIp(req);
        } catch (Exception e) {
            return null;
        }
    }

    private AdminUserResponse buildResponse(User user) {
        long taskCount   = taskRepository.countByUserId(user.getId());
        long accessCount = accessLogRepository.countByUserId(user.getId());
        return AdminUserResponse.fromEntity(user, taskCount, accessCount);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // OPERAÇÕES PÚBLICAS
    // ═══════════════════════════════════════════════════════════════════════

    public List<AdminUserResponse> getAllUsers() {
        // [DUP-03] securityService.getCurrentUser() substitui getCurrentAdmin() local
        User admin = securityService.getCurrentUser();
        persistAudit(admin, null, AdminAuditLog.ACTION_GET_USERS, null, AdminAuditLog.RESULT_SUCCESS);
        return userRepository.findAll().stream()
                .map(this::buildResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = false)
    public void deleteUser(Long id) {
        User admin = securityService.getCurrentUser();

        // [ASVS 4.1.1] Auto-proteção
        if (admin.getId().equals(id)) {
            persistAudit(admin, admin, AdminAuditLog.ACTION_DELETE_USER,
                "Tentativa de auto-exclusão bloqueada", AdminAuditLog.RESULT_BLOCKED);
            throw new IllegalArgumentException("error.admin.cannotDeleteSelf");
        }

        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("error.user.notFound"));

        // [SUPER_ADMIN SHIELD]
        assertCanManage(target, admin, AdminAuditLog.ACTION_DELETE_USER);

        userRepository.delete(target);
        persistAudit(admin, target, AdminAuditLog.ACTION_DELETE_USER,
            "Conta excluída pelo administrador", AdminAuditLog.RESULT_SUCCESS);
        log.info("[ADMIN] Usuário {} excluído pelo admin {}", target.getEmail(), admin.getEmail());
    }

    @Transactional(readOnly = false)
    public AdminUserResponse changeUserEmail(Long id, String newEmail) {
        User admin = securityService.getCurrentUser();

        // [INPUT VALIDATION: guard clause primeiro] Normalização e sanitização do e-mail
        if (newEmail == null || newEmail.isBlank()) {
            throw new IllegalArgumentException("error.email.empty");
        }
        String normalized = newEmail.toLowerCase().trim();

        if (!normalized.matches("^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$")) {
            throw new IllegalArgumentException("error.email.invalidFormat");
        }

        if (normalized.length() > 254) {
            throw new IllegalArgumentException("error.email.tooLong");
        }

        // Auto-proteção
        if (admin.getId().equals(id)) {
            persistAudit(admin, admin, AdminAuditLog.ACTION_CHANGE_EMAIL,
                "Tentativa de auto-alteração de e-mail bloqueada", AdminAuditLog.RESULT_BLOCKED);
            throw new IllegalArgumentException("error.admin.useProfileForOwnEmail");
        }

        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("error.user.notFound"));

        // [SUPER_ADMIN SHIELD]
        assertCanManage(target, admin, AdminAuditLog.ACTION_CHANGE_EMAIL);

        // Verificar blacklist
        if (blacklistedEmailRepository.isBlacklisted(normalized)) {
            persistAudit(admin, target, AdminAuditLog.ACTION_CHANGE_EMAIL,
                "E-mail bloqueado na blacklist: " + normalized, AdminAuditLog.RESULT_BLOCKED);
            throw new IllegalArgumentException("error.email.blocked");
        }

        // Verificar unicidade
        if (userRepository.existsByEmailIgnoreCase(normalized)) {
            persistAudit(admin, target, AdminAuditLog.ACTION_CHANGE_EMAIL,
                "E-mail já em uso: " + normalized, AdminAuditLog.RESULT_BLOCKED);
            throw new IllegalArgumentException("error.email.inUse");
        }

        String previousEmail = target.getEmail();
        target.setEmail(normalized);
        User saved = userRepository.save(target);

        persistAudit(admin, saved, AdminAuditLog.ACTION_CHANGE_EMAIL,
            String.format("E-mail alterado: [%s] → [%s]", previousEmail, normalized),
            AdminAuditLog.RESULT_SUCCESS);
        log.info("[ADMIN] E-mail do usuário {} alterado de {} para {} pelo admin {}",
            target.getId(), previousEmail, normalized, admin.getEmail());

        return buildResponse(saved);
    }

    @Transactional(readOnly = false)
    public AdminUserResponse changeUserRole(Long id, String roleName) {
        User admin = securityService.getCurrentUser();

        // [REF-05 FIX] Input validation PRIMEIRO (guard clause), antes de qualquer lógica de negócio
        if (roleName == null || roleName.isBlank()) {
            throw new IllegalArgumentException("error.role.empty");
        }

        UserRole newRole;
        try {
            newRole = UserRole.valueOf(roleName.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("error.role.invalid");
        }

        // Auto-proteção (após validar o input)
        if (admin.getId().equals(id)) {
            persistAudit(admin, admin, AdminAuditLog.ACTION_CHANGE_ROLE,
                "Tentativa de auto-alteração de role bloqueada", AdminAuditLog.RESULT_BLOCKED);
            throw new IllegalArgumentException("error.admin.cannotChangeOwnRole");
        }

        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("error.user.notFound"));

        // [SUPER_ADMIN SHIELD] Bloqueio de rebaixamento
        assertCanManage(target, admin, AdminAuditLog.ACTION_CHANGE_ROLE);

        // Apenas SUPER_ADMIN pode promover outros a SUPER_ADMIN
        if (newRole == UserRole.ROLE_SUPER_ADMIN && admin.getRole() != UserRole.ROLE_SUPER_ADMIN) {
            persistAudit(admin, target, AdminAuditLog.ACTION_CHANGE_ROLE,
                "Tentativa de promover para SUPER_ADMIN sem permissão", AdminAuditLog.RESULT_BLOCKED);
            log.warn("[SECURITY] Admin {} tentou promover usuário {} para SUPER_ADMIN sem permissão",
                admin.getEmail(), target.getEmail());
            throw new IllegalArgumentException("error.admin.onlySuperAdminCanPromote");
        }

        UserRole previousRole = target.getRole();
        target.setRole(newRole);
        User saved = userRepository.save(target);

        persistAudit(admin, saved, AdminAuditLog.ACTION_CHANGE_ROLE,
            String.format("Role alterada: [%s] → [%s]", previousRole.name(), newRole.name()),
            AdminAuditLog.RESULT_SUCCESS);
        log.info("[ADMIN] Role do usuário {} alterada de {} para {} pelo admin {}",
            target.getId(), previousRole, newRole, admin.getEmail());

        return buildResponse(saved);
    }

    public Map<String, Object> getSystemStats() {
        User admin = securityService.getCurrentUser();
        persistAudit(admin, null, AdminAuditLog.ACTION_GET_STATS, null, AdminAuditLog.RESULT_SUCCESS);

        long totalUsers    = userRepository.count();
        long totalTasks    = taskRepository.count();
        long totalAccesses = accessLogRepository.count();

        LocalDateTime last7Days  = LocalDateTime.now().minusDays(7);
        LocalDateTime last30Days = LocalDateTime.now().minusDays(30);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers",         totalUsers);
        stats.put("totalTasks",         totalTasks);
        stats.put("totalAccesses",      totalAccesses);
        stats.put("newUsersLast7Days",  userRepository.countByCreatedAtAfter(last7Days));
        stats.put("newUsersLast30Days", userRepository.countByCreatedAtAfter(last30Days));
        stats.put("accessesLast7Days",  accessLogRepository.countByAccessedAtAfter(last7Days));
        stats.put("accessesLast30Days", accessLogRepository.countByAccessedAtAfter(last30Days));
        return stats;
    }

    /**
     * Retorna logs de auditoria paginados (máx 50 por página).
     * Apenas ADMIN e SUPER_ADMIN podem ver; validado pelo @PreAuthorize no Controller.
     */
    public Page<AdminAuditLog> getAuditLogs(int page) {
        User admin = securityService.getCurrentUser();
        Pageable pageable = PageRequest.of(Math.max(0, page), 50);
        persistAudit(admin, null, AdminAuditLog.ACTION_GET_AUDIT_LOGS,
            "Página: " + page, AdminAuditLog.RESULT_SUCCESS);
        return auditLogRepository.findAllByOrderByPerformedAtDesc(pageable);
    }
}
