package com.taskmanager.dto;

import com.taskmanager.entity.Task.TaskStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateTaskStatusRequest {
    
    @NotNull(message = "O status é obrigatório")
    private TaskStatus status;

    public UpdateTaskStatusRequest() {}

    public UpdateTaskStatusRequest(TaskStatus status) {
        this.status = status;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }
}
