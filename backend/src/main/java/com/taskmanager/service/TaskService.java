package com.taskmanager.service;

import com.taskmanager.dto.TaskRequest;
import com.taskmanager.dto.TaskResponse;
import com.taskmanager.entity.Category;
import com.taskmanager.entity.Task;
import com.taskmanager.entity.Task.TaskStatus;
import com.taskmanager.entity.User;
import com.taskmanager.repository.CategoryRepository;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }

    public List<TaskResponse> getAllTasks() {
        User user = getCurrentUser();
        return taskRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(TaskResponse::fromEntity).collect(Collectors.toList());
    }

    public List<TaskResponse> getTasksByStatus(TaskStatus status) {
        User user = getCurrentUser();
        return taskRepository.findByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), status)
                .stream().map(TaskResponse::fromEntity).collect(Collectors.toList());
    }

    public List<TaskResponse> searchTasks(String keyword) {
        User user = getCurrentUser();
        String sanitized = keyword.trim();
        if (sanitized.isEmpty()) {
            return taskRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                    .stream().map(TaskResponse::fromEntity).collect(Collectors.toList());
        }
        return taskRepository.searchByUserIdAndKeyword(user.getId(), sanitized)
                .stream().map(TaskResponse::fromEntity).collect(Collectors.toList());
    }

    public TaskResponse getTaskById(Long id) {
        User user = getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new RuntimeException("Tarefa não encontrada"));
        return TaskResponse.fromEntity(task);
    }

    @Transactional(readOnly = false)
    public TaskResponse createTask(TaskRequest request) {
        User user = getCurrentUser();

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
        User user = getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new RuntimeException("Tarefa não encontrada"));

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
        User user = getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new RuntimeException("Tarefa não encontrada"));
        task.setStatus(status);
        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    @Transactional(readOnly = false)
    public void deleteTask(Long id) {
        User user = getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new RuntimeException("Tarefa não encontrada"));
        taskRepository.delete(task);
    }

    public Map<String, Long> getStats() {
        User user = getCurrentUser();
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
                .orElseThrow(() -> new RuntimeException("Categoria não encontrada"));
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
