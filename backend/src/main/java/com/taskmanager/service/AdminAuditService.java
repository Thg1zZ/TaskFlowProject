package com.taskmanager.service;

import com.taskmanager.entity.AdminAuditLog;
import com.taskmanager.repository.AdminAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Serviço dedicado a salvar os logs de auditoria do Admin.
 * Deve estar em uma classe separada para que o Spring AOP aplique o proxy transacional corretamente.
 */
@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private final AdminAuditLogRepository auditLogRepository;

    /**
     * Usa PROPAGATION_REQUIRES_NEW para garantir que a inserção no banco de dados ocorra em
     * uma nova transação independente. Isso previne o erro "cannot execute INSERT in a read-only transaction"
     * quando chamado por métodos de leitura (como getAllUsers) e garante que o log sobreviva a
     * qualquer rollback ocorrido na transação principal (ex: exceção lançada após bloqueio de ação).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLog(AdminAuditLog entry) {
        auditLogRepository.save(entry);
    }
}
