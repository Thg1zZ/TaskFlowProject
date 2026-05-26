package com.taskmanager.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "blacklisted_emails", indexes = {
    @Index(name = "idx_blacklisted_email", columnList = "email", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlacklistedEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "deleted_at", nullable = false)
    private LocalDateTime deletedAt;

    @Column(length = 255)
    private String reason;

    @PrePersist
    protected void onCreate() {
        deletedAt = LocalDateTime.now();
    }
}
