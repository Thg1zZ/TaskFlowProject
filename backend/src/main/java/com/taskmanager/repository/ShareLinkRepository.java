package com.taskmanager.repository;

import com.taskmanager.entity.ShareLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ShareLinkRepository extends JpaRepository<ShareLink, Long> {
    Optional<ShareLink> findByToken(UUID token);
    Optional<ShareLink> findByTaskIdAndIsActiveTrue(Long taskId);
}
