package com.taskmanager.repository;

import com.taskmanager.entity.TaskParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskParticipantRepository extends JpaRepository<TaskParticipant, Long> {
    List<TaskParticipant> findByTaskId(Long taskId);
    List<TaskParticipant> findByUserId(Long userId);
    Optional<TaskParticipant> findByTaskIdAndUserId(Long taskId, Long userId);
    boolean existsByTaskIdAndUserId(Long taskId, Long userId);
    long deleteByTaskIdAndUserId(Long taskId, Long userId);
}
