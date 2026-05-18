package com.taskmanager.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * [VULN-07 FIX] Armazenar apenas o hash SHA-256 do token, nunca o token em texto puro.
     * O token plain-text é enviado por e-mail e nunca persistido.
     * Assim, um atacante com acesso ao banco não pode reutilizar os valores para reset.
     * ASVS 2.5.4 / CWE-312 (Cleartext Storage of Sensitive Information)
     */
    @Column(nullable = false, unique = true, name = "token_hash")
    private String tokenHash;

    @OneToOne(targetEntity = User.class, fetch = FetchType.EAGER)
    @JoinColumn(nullable = false, name = "user_id")
    private User user;

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiryDate);
    }
}
