package com.taskmanager.repository;

import com.taskmanager.entity.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Date;

@Repository
public interface RevokedTokenRepository extends JpaRepository<RevokedToken, String> {

    @Modifying
    @Query("DELETE FROM RevokedToken r WHERE r.expiryDate < :now")
    void deleteExpiredTokens(Date now);
}
