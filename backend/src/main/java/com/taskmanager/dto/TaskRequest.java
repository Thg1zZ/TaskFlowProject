package com.taskmanager.dto;

import com.taskmanager.entity.Task.TaskPriority;
import com.taskmanager.entity.Task.TaskStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TaskRequest {

    @NotBlank(message = "Título é obrigatório")
    @Size(min = 1, max = 200)
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
    @Max(value = 43200, message = "Máximo de 43200 minutos (30 dias)")
    private Integer estimatedMinutes;
}
