package com.taskmanager.repository;

import com.taskmanager.entity.Task;
import com.taskmanager.entity.Task.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.category WHERE (t.user.id = :userId OR EXISTS (SELECT 1 FROM TaskParticipant p WHERE p.task.id = t.id AND p.user.id = :userId)) ORDER BY t.createdAt DESC")
    List<Task> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.category WHERE (t.user.id = :userId OR EXISTS (SELECT 1 FROM TaskParticipant p WHERE p.task.id = t.id AND p.user.id = :userId)) AND t.status = :status ORDER BY t.createdAt DESC")
    List<Task> findByUserIdAndStatusOrderByCreatedAtDesc(@Param("userId") Long userId,
                                                          @Param("status") TaskStatus status,
                                                          Pageable pageable);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.category WHERE t.id = :id AND (t.user.id = :userId OR EXISTS (SELECT 1 FROM TaskParticipant p WHERE p.task.id = t.id AND p.user.id = :userId))")
    Optional<Task> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Query("SELECT COUNT(DISTINCT t) FROM Task t WHERE (t.user.id = :userId OR EXISTS (SELECT 1 FROM TaskParticipant p WHERE p.task.id = t.id AND p.user.id = :userId))")
    long countByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(DISTINCT t) FROM Task t WHERE (t.user.id = :userId OR EXISTS (SELECT 1 FROM TaskParticipant p WHERE p.task.id = t.id AND p.user.id = :userId)) AND t.status = :status")
    long countByUserIdAndStatus(@Param("userId") Long userId, @Param("status") TaskStatus status);

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.category WHERE (t.user.id = :userId OR EXISTS (SELECT 1 FROM TaskParticipant p WHERE p.task.id = t.id AND p.user.id = :userId)) AND " +
           "(LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Task> searchByUserIdAndKeyword(@Param("userId") Long userId, @Param("keyword") String keyword, Pageable pageable);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Task t WHERE t.id = :id AND (t.user.id = :userId OR EXISTS (SELECT 1 FROM TaskParticipant p WHERE p.task.id = t.id AND p.user.id = :userId))")
    Optional<Task> findByIdAndUserIdForUpdate(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * [REF-10] Conta tarefas por status em uma única query GROUP BY,
     * eliminando o N+1 implícito de 4 queries separadas no TaskService.getStats().
     *
     * Retorna lista de Object[] onde: [0] = TaskStatus, [1] = Long count
     */
    @Query("SELECT t.status, COUNT(DISTINCT t) FROM Task t WHERE (t.user.id = :userId OR EXISTS (SELECT 1 FROM TaskParticipant p WHERE p.task.id = t.id AND p.user.id = :userId)) GROUP BY t.status")
    List<Object[]> countByUserIdGroupByStatus(@Param("userId") Long userId);
}
