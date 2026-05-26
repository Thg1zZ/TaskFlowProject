package com.taskmanager.repository;

import com.taskmanager.entity.UserAccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface UserAccessLogRepository extends JpaRepository<UserAccessLog, Long> {

    long countByUserId(Long userId);

    long countByAccessedAtAfter(LocalDateTime date);

    @Query("SELECT COUNT(DISTINCT a.user.id) FROM UserAccessLog a WHERE a.accessedAt > :date")
    long countDistinctUsersByAccessedAtAfter(@Param("date") LocalDateTime date);
}
