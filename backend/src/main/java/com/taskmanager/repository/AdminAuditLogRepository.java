package com.taskmanager.repository;

import com.taskmanager.entity.AdminAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * [ASVS 7.2.1 / REF-09] Repositório de auditoria com imutabilidade total.
 *
 * REGRA: Registros de auditoria são write-once — apenas INSERT via save().
 * Nenhum método de UPDATE ou DELETE está exposto através da API.
 *
 * [REF-09 FIX] Antes, apenas deleteById() era sobrescrito.
 * Agora todos os métodos de exclusão herdados de JpaRepository são bloqueados:
 *   - deleteById(ID)
 *   - delete(T entity)
 *   - deleteAll()
 *   - deleteAll(Iterable)
 *   - deleteAllById(Iterable)
 *   - deleteAllInBatch() / deleteAllByIdInBatch()
 *
 * Isso previne que código futuro chame inadvertidamente qualquer variante de delete
 * e corrompa a trilha de auditoria.
 */
@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    // ── QUERIES DE LEITURA ────────────────────────────────────────────────────

    /** Todos os logs, do mais recente ao mais antigo — paginado */
    Page<AdminAuditLog> findAllByOrderByPerformedAtDesc(Pageable pageable);

    /** Logs de um admin específico */
    Page<AdminAuditLog> findByAdminIdOrderByPerformedAtDesc(Long adminId, Pageable pageable);

    /** Logs sobre um usuário alvo específico */
    Page<AdminAuditLog> findByTargetUserIdOrderByPerformedAtDesc(Long targetUserId, Pageable pageable);

    /** Logs de uma ação específica */
    Page<AdminAuditLog> findByActionOrderByPerformedAtDesc(String action, Pageable pageable);

    // ── BLOQUEIOS DE EXCLUSÃO (IMUTABILIDADE) ────────────────────────────────
    // Todos herdam de JpaRepository e precisam ser explicitamente bloqueados.
    // @Query("SELECT 1") é inofensivo — o método lança exceção antes de executar.

    /** Bloqueio: deleteById(ID) */
    @Override
    @Modifying
    @Query("SELECT 1")
    default void deleteById(Long id) {
        throw new UnsupportedOperationException(
            "[IMUTABILIDADE] Registros de auditoria admin não podem ser excluídos.");
    }

    /** Bloqueio: delete(T entity) */
    @Override
    default void delete(AdminAuditLog entity) {
        throw new UnsupportedOperationException(
            "[IMUTABILIDADE] Registros de auditoria admin não podem ser excluídos.");
    }

    /** Bloqueio: deleteAll() */
    @Override
    default void deleteAll() {
        throw new UnsupportedOperationException(
            "[IMUTABILIDADE] Registros de auditoria admin não podem ser excluídos.");
    }

    /** Bloqueio: deleteAll(Iterable) */
    @Override
    default void deleteAll(Iterable<? extends AdminAuditLog> entities) {
        throw new UnsupportedOperationException(
            "[IMUTABILIDADE] Registros de auditoria admin não podem ser excluídos.");
    }

    /** Bloqueio: deleteAllById(Iterable) */
    @Override
    default void deleteAllById(Iterable<? extends Long> ids) {
        throw new UnsupportedOperationException(
            "[IMUTABILIDADE] Registros de auditoria admin não podem ser excluídos.");
    }

    /** Bloqueio: deleteAllInBatch() */
    @Override
    default void deleteAllInBatch() {
        throw new UnsupportedOperationException(
            "[IMUTABILIDADE] Registros de auditoria admin não podem ser excluídos.");
    }

    /** Bloqueio: deleteAllByIdInBatch(Iterable) */
    @Override
    default void deleteAllByIdInBatch(Iterable<Long> ids) {
        throw new UnsupportedOperationException(
            "[IMUTABILIDADE] Registros de auditoria admin não podem ser excluídos.");
    }

    /** Bloqueio: deleteAllInBatch(Iterable) */
    @Override
    default void deleteAllInBatch(Iterable<AdminAuditLog> entities) {
        throw new UnsupportedOperationException(
            "[IMUTABILIDADE] Registros de auditoria admin não podem ser excluídos.");
    }
}
