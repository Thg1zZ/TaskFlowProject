package com.taskmanager.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * [ASVS 7.2.1 / OWASP A09] Log de auditoria de ações administrativas.
 *
 * IMUTABILIDADE: Registros de auditoria NUNCA são atualizados nem excluídos
 * através da API — apenas INSERT é permitido. Qualquer tentativa de DELETE
 * ou UPDATE via API deve ser recusada pelo service layer.
 *
 * Armazena: quem fez, o quê, sobre quem, quando, de onde (hash de IP).
 */
@Entity
@Table(name = "admin_audit_logs", indexes = {
    @Index(name = "idx_audit_admin", columnList = "admin_id"),
    @Index(name = "idx_audit_target", columnList = "target_user_id"),
    @Index(name = "idx_audit_time", columnList = "performed_at"),
    @Index(name = "idx_audit_action", columnList = "action")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Admin que executou a ação */
    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(name = "admin_email", nullable = false, length = 255)
    private String adminEmail;

    @Column(name = "admin_role", nullable = false, length = 30)
    private String adminRole;

    /** Usuário alvo da ação (pode ser null para ações globais como getStats) */
    @Column(name = "target_user_id")
    private Long targetUserId;

    @Column(name = "target_user_email", length = 255)
    private String targetUserEmail;

    /**
     * Ação executada — valores controlados pelo sistema (não pelo usuário).
     * Ex: GET_USERS, DELETE_USER, CHANGE_EMAIL, CHANGE_ROLE, GET_STATS, GET_AUDIT_LOGS
     */
    @Column(name = "action", nullable = false, length = 50)
    private String action;

    /** Detalhes adicionais da ação (ex: role anterior → nova role). Nunca contém senhas. */
    @Column(name = "details", length = 500)
    private String details;

    /**
     * Resultado da operação.
     * SUCCESS — ação completada com sucesso.
     * BLOCKED — ação bloqueada por regra de segurança (ex: tentativa de modificar SUPER_ADMIN).
     * FAILED  — erro inesperado ou validação de negócio falhou.
     */
    @Column(name = "result", nullable = false, length = 20)
    private String result;

    /** Hash SHA-256 do IP do admin no momento da ação (LGPD art. 12) */
    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    /** Timestamp UTC imutável — definido pelo @PrePersist */
    @Column(name = "performed_at", nullable = false, updatable = false)
    private LocalDateTime performedAt;

    @PrePersist
    protected void onCreate() {
        performedAt = LocalDateTime.now();
    }

    // ── Constantes de ação e resultado (evitam strings soltas no código) ────

    public static final String ACTION_GET_USERS      = "GET_USERS";
    public static final String ACTION_DELETE_USER    = "DELETE_USER";
    public static final String ACTION_CHANGE_EMAIL   = "CHANGE_EMAIL";
    public static final String ACTION_CHANGE_ROLE    = "CHANGE_ROLE";
    public static final String ACTION_GET_STATS      = "GET_STATS";
    public static final String ACTION_GET_AUDIT_LOGS = "GET_AUDIT_LOGS";

    public static final String RESULT_SUCCESS = "SUCCESS";
    public static final String RESULT_BLOCKED = "BLOCKED";
    public static final String RESULT_FAILED  = "FAILED";
}
