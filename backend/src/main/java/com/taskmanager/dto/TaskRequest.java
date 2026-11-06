package com.taskmanager.dto;

import com.taskmanager.entity.Task.TaskPriority;
import com.taskmanager.entity.Task.TaskRecurrence;
import com.taskmanager.entity.Task.TaskStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Data
public class TaskRequest {

    @NotBlank(message = "{validation.task.title.required}")
    @Size(max = 200)
    private String title;

    @Size(max = 2000)
    private String description;

    private TaskStatus status;
    private TaskPriority priority;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate dueDate;
    private Long categoryId;

    /** [VULN-09 FIX] Limite superior adicionado: máx 43200 min = 30 dias */
    @Min(value = 1)
    @Max(value = 43200, message = "{validation.task.estimate.max}")
    private Integer estimatedMinutes;

    @Min(value = 0, message = "{validation.task.timeSpent.min}")
    @Max(value = 43200, message = "{validation.task.timeSpent.max}")
    private Integer timeSpentMinutes;

    private TaskRecurrence recurrence;

    /** null = não alterar (na edição). */
    @Size(max = 5, message = "{validation.task.tags.max}")
    private Set<@NotBlank @Size(max = 30, message = "{validation.task.tag.size}") String> tags;

    /** null = não alterar (na edição). Itens com id existente são atualizados; os ausentes são removidos. */
    @Size(max = 20, message = "{validation.task.subtasks.max}")
    private List<@Valid SubtaskInput> subtasks;

    public record SubtaskInput(Long id,
                               @NotBlank @Size(max = 200, message = "{validation.task.subtask.size}") String title,
                               boolean done) {}
}
