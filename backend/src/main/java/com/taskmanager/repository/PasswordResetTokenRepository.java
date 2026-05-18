package com.taskmanager.repository;

import com.taskmanager.entity.PasswordResetToken;
import com.taskmanager.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    /** [VULN-07 FIX] Busca por hash SHA-256 do token, nunca por token plain-text */
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
    Optional<PasswordResetToken> findByUser(User user);
    void deleteByUser(User user);
}
