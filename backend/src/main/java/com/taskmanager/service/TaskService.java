package com.taskmanager.service;

import com.taskmanager.dto.TaskRequest;
import com.taskmanager.dto.TaskResponse;
import com.taskmanager.entity.Category;
import com.taskmanager.entity.Task;
import com.taskmanager.entity.Task.TaskStatus;
import com.taskmanager.entity.User;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.CategoryRepository;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class TaskService {

    @Autowired private TaskRepository taskRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private SecurityService securityService;

    private org.springframework.data.domain.Pageable createSafePageable(int page, int size) {
        int safeSize = Math.min(size, 100);
        return PageRequest.of(page, safeSize);
    }

    public List<TaskResponse> getAllTasks(int page, int size) {
        User user = securityService.getCurrentUser();
        return taskRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), createSafePageable(page, size))
                .stream().map(TaskResponse::fromEntity).collect(Collectors.toList());
    }

    public List<TaskResponse> getTasksByStatus(TaskStatus status, int page, int size) {
        User user = securityService.getCurrentUser();
        return taskRepository.findByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), status, createSafePageable(page, size))
                .stream().map(TaskResponse::fromEntity).collect(Collectors.toList());
    }

    public List<TaskResponse> searchTasks(String keyword, int page, int size) {
        User user = securityService.getCurrentUser();
        String sanitized = keyword.trim();
        if (sanitized.isEmpty()) {
            return taskRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), createSafePageable(page, size))
                    .stream().map(TaskResponse::fromEntity).collect(Collectors.toList());
        }
        return taskRepository.searchByUserIdAndKeyword(user.getId(), sanitized, createSafePageable(page, size))
                .stream().map(TaskResponse::fromEntity).collect(Collectors.toList());
    }

    public TaskResponse getTaskById(Long id) {
        User user = securityService.getCurrentUser();
        // [REF-02] findOwnedTaskOrThrow centraliza o orElseThrow repetido
        return TaskResponse.fromEntity(findOwnedTaskOrThrow(id, user.getId()));
    }

    @Transactional(readOnly = false)
    public TaskResponse createTask(TaskRequest request) {
        User user = securityService.getCurrentUser();

        Category category = resolveCategory(request.getCategoryId(), user.getId());
        LocalDate endDate = resolveEndDate(request);
        validateDateRange(request.getStartDate(), endDate);

        Task task = Task.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .status(request.getStatus() != null ? request.getStatus() : TaskStatus.TODO)
                .priority(request.getPriority() != null ? request.getPriority() : Task.TaskPriority.MEDIUM)
                .startDate(request.getStartDate())
                .endDate(endDate)
                .dueDate(endDate)
                .estimatedMinutes(request.getEstimatedMinutes())
                .timeSpentMinutes(request.getTimeSpentMinutes() != null ? request.getTimeSpentMinutes() : 0)
                .category(category)
                .user(user)
                .build();

        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    @Transactional(readOnly = false)
    public TaskResponse updateTask(Long id, TaskRequest request) {
        User user = securityService.getCurrentUser();
        Task task = findOwnedTaskOrThrow(id, user.getId()); // [REF-02]

        Category category = resolveCategory(request.getCategoryId(), user.getId());
        LocalDate endDate = resolveEndDate(request);
        validateDateRange(request.getStartDate(), endDate);

        task.setTitle(request.getTitle().trim());
        task.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        if (request.getStatus() != null)   task.setStatus(request.getStatus());
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        task.setStartDate(request.getStartDate());
        task.setEndDate(endDate);
        task.setDueDate(endDate);
        task.setEstimatedMinutes(request.getEstimatedMinutes());
        if (request.getTimeSpentMinutes() != null) task.setTimeSpentMinutes(request.getTimeSpentMinutes());
        task.setCategory(category);

        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    @Transactional(readOnly = false)
    public TaskResponse updateTaskStatus(Long id, TaskStatus status) {
        User user = securityService.getCurrentUser();
        Task task = findOwnedTaskOrThrow(id, user.getId()); // [REF-02]
        task.setStatus(status);
        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    @Transactional(readOnly = false)
    public TaskResponse incrementTaskTime(Long id, Integer minutes) {
        User user = securityService.getCurrentUser();
        Task task = taskRepository.findByIdAndUserIdForUpdate(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));

        if (minutes == null || minutes < 1) {
            throw new IllegalArgumentException("Os minutos incrementados devem ser de no mínimo 1");
        }

        int currentSpent = task.getTimeSpentMinutes() != null ? task.getTimeSpentMinutes() : 0;
        int newSpent = currentSpent + minutes;

        if (newSpent > 43200) {
            throw new IllegalArgumentException("Tempo total gasto não pode exceder 30 dias (43200 minutos)");
        }

        task.setTimeSpentMinutes(newSpent);
        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    @Transactional(readOnly = false)
    public void deleteTask(Long id) {
        User user = securityService.getCurrentUser();
        taskRepository.delete(findOwnedTaskOrThrow(id, user.getId())); // [REF-02]
    }

    /**
     * [REF-10] Estatísticas das tarefas do usuário em uma única query GROUP BY.
     *
     * ANTES: 4 queries separadas (total + 3 por status) = N+1 implícito.
     * AGORA: 1 query GROUP BY + 1 para o total = 2 roundtrips ao banco.
     */
    public Map<String, Long> getStats() {
        User user = securityService.getCurrentUser();
        long userId = user.getId();

        // Inicializar com zero (status pode não ter tarefas)
        long total      = 0L;
        long todo       = 0L;
        long inProgress = 0L;
        long done       = 0L;

        for (Object[] row : taskRepository.countByUserIdGroupByStatus(userId)) {
            TaskStatus status = (TaskStatus) row[0];
            long count = (Long) row[1];
            total += count;
            switch (status) {
                case TODO        -> todo       = count;
                case IN_PROGRESS -> inProgress = count;
                case DONE        -> done       = count;
            }
        }

        Map<String, Long> stats = new HashMap<>();
        stats.put("total",      total);
        stats.put("todo",       todo);
        stats.put("inProgress", inProgress);
        stats.put("done",       done);
        return stats;
    }

    /**
     * [REF-02] Helper centralizado que substitui o padrão findByIdAndUserId + orElseThrow
     * que estava repetido em 5 métodos diferentes (getTaskById, updateTask,
     * updateTaskStatus, deleteTask — incrementTaskTime usa findForUpdate por precisar de lock).
     */
    private Task findOwnedTaskOrThrow(Long id, Long userId) {
        return taskRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));
    }

    private Category resolveCategory(Long categoryId, Long userId) {
        if (categoryId == null) return null;
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
    }

    private LocalDate resolveEndDate(TaskRequest request) {
        return request.getEndDate() != null ? request.getEndDate() : request.getDueDate();
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            // [A05 CORREÇÃO] Encoding correto: caractere "ã" em UTF-8 nativo (não ISO corrompido)
            // O arquivo deve ser salvo como UTF-8 e o build configurado com -encoding UTF-8
            throw new IllegalArgumentException("Data inicial não pode ser depois da data final");
        }
    }
}
