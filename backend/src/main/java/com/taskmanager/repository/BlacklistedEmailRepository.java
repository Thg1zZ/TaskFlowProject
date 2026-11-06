package com.taskmanager.repository;

import com.taskmanager.entity.BlacklistedEmail;
import com.taskmanager.util.HashUtils;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BlacklistedEmailRepository extends JpaRepository<BlacklistedEmail, Long> {

    boolean existsByEmailHash(String emailHash);

    default boolean isBlacklisted(String email) {
        return existsByEmailHash(HashUtils.emailHash(email));
    }
}
