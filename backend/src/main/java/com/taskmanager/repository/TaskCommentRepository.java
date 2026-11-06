package com.taskmanager.repository;

import com.taskmanager.entity.TaskComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskCommentRepository extends JpaRepository<TaskComment, Long> {

    List<TaskComment> findByTaskIdOrderByCreatedAtAsc(Long taskId);

    Optional<TaskComment> findByIdAndUserId(Long id, Long userId);
    List<TaskComment> findByUserIdOrderByCreatedAtAsc(Long userId);
}
