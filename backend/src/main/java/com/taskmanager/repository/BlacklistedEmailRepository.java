package com.taskmanager.repository;

import com.taskmanager.entity.BlacklistedEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BlacklistedEmailRepository extends JpaRepository<BlacklistedEmail, Long> {
    boolean existsByEmailIgnoreCase(String email);
}
