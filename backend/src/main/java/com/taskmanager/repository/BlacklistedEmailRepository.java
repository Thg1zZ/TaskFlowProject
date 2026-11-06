package com.taskmanager.repository;

import com.taskmanager.entity.BlacklistedEmail;
import com.taskmanager.util.HashUtils;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface BlacklistedEmailRepository extends JpaRepository<BlacklistedEmail, Long> {

    boolean existsByEmailHash(String emailHash);

    default boolean isBlacklisted(String email) {
        return existsByEmailHash(HashUtils.emailHash(email));
    }

    /** [LGPD art. 15] Após o prazo de guarda, o e-mail volta a poder se cadastrar. */
    @Modifying
    @Query("DELETE FROM BlacklistedEmail b WHERE b.deletedAt < :cutoff")
    int deleteDeletedBefore(@Param("cutoff") LocalDateTime cutoff);
}
