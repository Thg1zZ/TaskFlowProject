package com.taskmanager.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * [LGPD] Registra acessos à plataforma.
 * O IP é armazenado como hash SHA-256 para anonimização (não é possível
 * reverter para o IP original), cumprindo o princípio da minimização de dados.
 */
@Entity
@Table(name = "user_access_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /** Hash SHA-256 do IP — nunca o IP real (LGPD art. 12) */
    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    @Column(name = "accessed_at", nullable = false, updatable = false)
    private LocalDateTime accessedAt;

    @PrePersist
    protected void onCreate() {
        accessedAt = LocalDateTime.now();
    }
}
