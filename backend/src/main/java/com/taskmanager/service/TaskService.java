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
import org.springframework.security.core.context.SecurityContextHolder;
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
        Task task = taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));
        return TaskResponse.fromEntity(task);
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
                .category(category)
                .user(user)
                .build();

        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    @Transactional(readOnly = false)
    public TaskResponse updateTask(Long id, TaskRequest request) {
        User user = securityService.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));

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
        task.setCategory(category);

        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    @Transactional(readOnly = false)
    public TaskResponse updateTaskStatus(Long id, TaskStatus status) {
        User user = securityService.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));
        task.setStatus(status);
        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    @Transactional(readOnly = false)
    public void deleteTask(Long id) {
        User user = securityService.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));
        taskRepository.delete(task);
    }

    public Map<String, Long> getStats() {
        User user = securityService.getCurrentUser();
        long total      = taskRepository.countByUserId(user.getId());
        long todo       = taskRepository.countByUserIdAndStatus(user.getId(), TaskStatus.TODO);
        long inProgress = taskRepository.countByUserIdAndStatus(user.getId(), TaskStatus.IN_PROGRESS);
        long done       = taskRepository.countByUserIdAndStatus(user.getId(), TaskStatus.DONE);

        Map<String, Long> stats = new HashMap<>();
        stats.put("total",      total);
        stats.put("todo",       todo);
        stats.put("inProgress", inProgress);
        stats.put("done",       done);
        return stats;
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
