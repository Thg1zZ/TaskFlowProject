package com.taskmanager.dto;

import com.taskmanager.entity.Task;
import com.taskmanager.entity.Task.TaskPriority;
import com.taskmanager.entity.Task.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {

    private Long id;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate dueDate;
    private Integer estimatedMinutes;
    private Integer timeSpentMinutes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Long categoryId;
    private String categoryName;
    private String categoryColor;
    private String categoryIcon;

    private int commentCount;

    public static TaskResponse fromEntity(Task task) {
        LocalDate finalEndDate = task.getEndDate() != null ? task.getEndDate() : task.getDueDate();

        TaskResponse r = TaskResponse.builder()
            .id(task.getId())
            .title(task.getTitle())
            .description(task.getDescription())
            .status(task.getStatus())
            .priority(task.getPriority())
            .startDate(task.getStartDate())
            .endDate(finalEndDate)
            .dueDate(finalEndDate)
            .estimatedMinutes(task.getEstimatedMinutes())
            .timeSpentMinutes(task.getTimeSpentMinutes() != null ? task.getTimeSpentMinutes() : 0)
            .createdAt(task.getCreatedAt())
            .updatedAt(task.getUpdatedAt())
            .build();

        if (task.getCategory() != null) {
            r.setCategoryId(task.getCategory().getId());
            r.setCategoryName(task.getCategory().getName());
            r.setCategoryColor(task.getCategory().getColor());
            r.setCategoryIcon(task.getCategory().getIcon());
        }

        r.setCommentCount((int) task.getCommentCount());

        return r;
    }
}
