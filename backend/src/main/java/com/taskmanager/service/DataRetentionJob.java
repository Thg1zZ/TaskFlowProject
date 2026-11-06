package com.taskmanager.service;

import com.taskmanager.repository.AdminAuditLogRepository;
import com.taskmanager.repository.BlacklistedEmailRepository;
import com.taskmanager.repository.PasswordResetTokenRepository;
import com.taskmanager.repository.UserAccessLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** [LGPD art. 15/16] Elimina dados que já cumpriram sua finalidade. Roda todo dia às 03:30. */
@Component
@RequiredArgsConstructor
public class DataRetentionJob {

    private static final Logger log = LoggerFactory.getLogger(DataRetentionJob.class);

    private final UserAccessLogRepository accessLogRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final BlacklistedEmailRepository blacklistRepository;

    @Value("${app.lgpd.access-log-retention-days:180}")
    private int accessLogRetentionDays;

    @Value("${app.lgpd.audit-log-retention-days:730}")
    private int auditLogRetentionDays;

    @Value("${app.lgpd.blacklist-retention-days:730}")
    private int blacklistRetentionDays;

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeExpiredData() {
        LocalDateTime now = LocalDateTime.now();
        int logs = accessLogRepository.deleteAccessedBefore(now.minusDays(accessLogRetentionDays));
        int tokens = resetTokenRepository.deleteExpiredBefore(now);
        int audits = auditLogRepository.deletePerformedBefore(now.minusDays(auditLogRetentionDays));
        int blacklisted = blacklistRepository.deleteDeletedBefore(now.minusDays(blacklistRetentionDays));
        log.info("[LGPD] Retenção: removidos {} acessos, {} tokens de redefinição, {} registros de auditoria e {} hashes de contas excluídas",
                logs, tokens, audits, blacklisted);
    }
}
