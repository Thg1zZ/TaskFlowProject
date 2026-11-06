package com.taskmanager.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** [LGPD] Impede o recadastro de contas excluídas guardando só o hash do e-mail. */
@Entity
@Table(name = "blacklisted_emails", indexes = {
    @Index(name = "idx_blacklisted_email_hash", columnList = "email_hash", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlacklistedEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email_hash", nullable = false, unique = true, length = 64)
    private String emailHash;

    @Column(name = "deleted_at", nullable = false)
    private LocalDateTime deletedAt;

    @Column(length = 255)
    private String reason;

    @PrePersist
    protected void onCreate() {
        deletedAt = LocalDateTime.now();
    }
}
